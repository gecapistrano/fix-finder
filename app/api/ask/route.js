import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { insertLog } from "@/lib/supabaseClient";
import { PACK_GRAMS, SUPER_GLUE_NAME } from "../../products";

// Canned result for UI testing when no AI key has quota left.
// Set AI_MOCK=true (or OPENAI_MOCK=true) in .env.local to skip paid APIs.
const PRODUCT_NAME = SUPER_GLUE_NAME;
const TUBE_GRAMS = PACK_GRAMS;

const DEMO_RESULT = {
  status: "resolved",
  object: "Ceramic mug",
  material: "Ceramic",
  damage: "The handle snapped off at the joint",
  suitable: true,
  grams: 1,
  tips: [
    "Wipe both broken edges clean and dry — glue sticks best on a dust-free surface.",
    "Hold the handle in place for about 30 seconds, then don't use the mug for 24 hours.",
    "After it has fully cured, the bond is water and dishwasher resistant.",
  ],
  recommended_product: `${PRODUCT_NAME} (1 g)`,
  why: "A few drops along the ceramic joint will hold the handle. Universal Super Glue bonds china and is dishwasher resistant after it cures.",
};

const UNSUITABLE_TIPS = [
  "Keep the pieces together — this one just needs a different adhesive.",
  "Take a clear photo of the damage to share with support.",
  "Reach out to the manufacturer's customer support. We'll help you from there.",
];

const UNSUITABLE_WHY =
  "That's okay — Super Glue isn't the right fit here. Keep the pieces, and we'll help you find the right adhesive.";

/**
 * Gemini latency is spiky under load — measured 33s, 44s and one outright hang
 * on the same prompt. Keep our own budget well inside `maxDuration` so a slow
 * upstream call fails as a clean, retryable 503 instead of the platform killing
 * the whole request with no usable response.
 */
const CLASSIFIER_TIMEOUT_MS = 45_000;
const FALLBACK_TIMEOUT_MS = 8_000;

function timeoutBudget(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

function loadPrompt(name) {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, name),
    join(process.cwd(), "app", "api", "ask", name),
  ];
  for (const file of candidates) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      // Try the next path — Vercel and local cwd can differ.
    }
  }
  throw new Error(`Missing prompt file: ${name}`);
}

function classifierPrompt() {
  return loadPrompt("fixfinder-repair-advisor-system-prompt.md");
}

function fallbackPrompt() {
  return loadPrompt("fixfinder-not-fixable-fallback-prompt.md");
}

/**
 * Split a data URL or raw base64 string into { mimeType, data }.
 * Gemini wants raw base64 in inlineData; OpenAI wants a data URL.
 */
function parseImage(image) {
  const trimmed = String(image).trim();

  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
  }

  let mimeType = "image/jpeg";
  if (trimmed.startsWith("iVBORw0KGgo")) {
    mimeType = "image/png";
  } else if (trimmed.startsWith("R0lGOD")) {
    mimeType = "image/gif";
  } else if (trimmed.startsWith("UklGR")) {
    mimeType = "image/webp";
  }

  return { mimeType, data: trimmed };
}

function repairTruncatedJson(text) {
  let out = String(text).trim();
  const start = out.indexOf("{");
  if (start > 0) {
    out = out.slice(start);
  }

  let inString = false;
  let escape = false;
  for (const ch of out) {
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else if (ch === '"') {
      inString = true;
    }
  }
  if (inString) {
    out += '"';
  }

  out = out.replace(/,\s*$/, "");

  let braceDepth = 0;
  let bracketDepth = 0;
  inString = false;
  escape = false;
  for (const ch of out) {
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      braceDepth += 1;
    } else if (ch === "}") {
      braceDepth -= 1;
    } else if (ch === "[") {
      bracketDepth += 1;
    } else if (ch === "]") {
      bracketDepth -= 1;
    }
  }

  out += "]".repeat(Math.max(0, bracketDepth));
  out += "}".repeat(Math.max(0, braceDepth));
  return out;
}

function parseClassifierJson(rawContent) {
  if (!rawContent) {
    throw new Error("The model returned an empty response. Please try again.");
  }

  const stripped = String(rawContent)
    .replace(/^\s*`{3}(?:json)?\s*/i, "")
    .replace(/\s*`{3}\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    // Gemini/Groq sometimes cut the JSON off mid-string when busy.
    parsed = JSON.parse(repairTruncatedJson(stripped));
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("The model returned invalid JSON.");
  }

  return parsed;
}

function parseSuggestedAnswers(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * Pass through Gemini's clarification verdict only.
 * Do not invent this from image-quality or other app heuristics —
 * the prompt owns when to ask (and defaults to resolving in one call).
 */
function isClarificationResult(parsed) {
  const status = String(parsed.status || "")
    .trim()
    .toLowerCase();
  if (status === "needs_clarification") {
    return true;
  }
  if (status === "resolved") {
    return false;
  }
  // Model omitted status but still returned the clarification schema.
  const question = firstPresent(parsed.clarifying_question);
  return Boolean(question) && parsed.fixable == null && parsed.suitable == null;
}

function formatClarificationResult(parsed, scanId) {
  return {
    status: "needs_clarification",
    scan_id: scanId,
    object: firstPresent(parsed.object, parsed.item_identified),
    material: firstPresent(parsed.material),
    damage: firstPresent(parsed.damage, parsed.damage_type),
    clarifying_question:
      firstPresent(parsed.clarifying_question) ||
      "Could you tell us a bit more about the item or the material?",
    suggested_answers: parseSuggestedAnswers(parsed.suggested_answers),
    allow_custom_answer: parsed.allow_custom_answer !== false,
    suitable: null,
    fixable: null,
    grams: null,
    confidence: firstPresent(parsed.confidence),
    recommended_product: "",
    why: null,
    user_message: null,
  };
}

function interpretClassifier(parsed, { userNote, isFollowUp, scanId }) {
  if (isClarificationResult(parsed)) {
    if (isFollowUp) {
      console.warn("Fix Finder blocked a second clarification round", {
        scan_id: scanId,
        question: firstPresent(parsed.clarifying_question),
      });
      return {
        kind: "resolved",
        outcome: "unresolved_after_clarification",
        result: normalizeAdvice(
          {
            ...parsed,
            status: "resolved",
            fixable: false,
            suitable: false,
            grams_needed: null,
            grams: null,
            reason: "unresolved after clarification",
          },
          userNote,
        ),
      };
    }

    return {
      kind: "clarification",
      outcome: "clarification_requested",
      result: formatClarificationResult(parsed, scanId),
    };
  }

  return {
    kind: "resolved",
    outcome: null,
    result: normalizeAdvice(parsed, userNote),
  };
}

function parseSuitable(parsed, grams) {
  const status = String(parsed.status || "")
    .trim()
    .toLowerCase();
  if (status === "needs_clarification") {
    return null;
  }

  const value =
    parsed.suitable ?? parsed.fixable ?? parsed.can_fix ?? parsed.recommended;
  if (value == null || value === "") {
    return grams != null && grams > 0;
  }

  const text = String(value)
    .trim()
    .toLowerCase();

  if (
    value === false ||
    value === 0 ||
    text === "false" ||
    text === "no" ||
    text === "not fixable" ||
    text === "unsuitable"
  ) {
    return false;
  }

  if (
    value === true ||
    value === 1 ||
    text === "true" ||
    text === "yes" ||
    text === "suitable" ||
    text === "fixable"
  ) {
    return true;
  }

  return grams != null && grams > 0;
}

function firstPresent(...values) {
  for (const value of values) {
    if (value == null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function firstSentence(text) {
  const match = String(text || "").match(/[^.!?]+[.!?]?/);
  return match ? match[0].trim() : "";
}

function displayWhy(userMessage, fallback) {
  const parts = String(userMessage || "")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const useful = parts.find(
    (part) => part.length > 28 && !/^thanks for/i.test(part),
  );
  return useful || firstSentence(userMessage) || fallback || "";
}

function extractSteps(message) {
  const steps = [];
  for (const line of String(message || "").split(/\n+/)) {
    const match = line.match(/^\s*(?:\d+[\.)]|[-*])\s+(.+)/);
    if (match) {
      steps.push(match[1].trim());
    }
  }
  return steps.slice(0, 8);
}

function defaultRepairTips(object, material) {
  const item = object || "the pieces";
  const porous = /\b(wood|leather|paper|cardboard|unglazed)\b/i.test(
    `${object} ${material}`,
  );
  return [
    `Clean and dry both faces of ${item}. Wipe away dust, grease, or old adhesive.`,
    "This adhesive bonds skin in seconds. Work on a protected surface and avoid touching wet glue — gloves help if you have them.",
    "Apply a thin line or a few small dots to one surface only. A little is enough.",
    porous
      ? "Press the pieces together firmly and hold for about 45–60 seconds."
      : "Press the pieces together firmly and hold for about 15–30 seconds.",
    "Let it set in seconds, then leave it 24 hours before using or washing the item. After a full cure, the bond is water and dishwasher resistant.",
    "Wipe any squeeze-out immediately. Extra glue does not make a stronger joint.",
  ];
}

function blobText(parsed) {
  return [
    parsed.object,
    parsed.item_identified,
    parsed.material,
    parsed.damage,
    parsed.damage_type,
    parsed.reason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasSafetyOrIncompatibleReason(parsed) {
  const text = blobText(parsed);
  return (
    /\b(polyethylene|polypropylene|\bpp\b|\bpe\b|ptfe|teflon|silicone|styrofoam|foam rubber|polystyrene foam)\b/.test(
      text,
    ) ||
    /\b(food.?safe|food.?contact|eating surface|drinking surface|inside of (the )?(cup|mug|bottle))\b/.test(
      text,
    ) ||
    /\b(load.?bearing|structural|ladder|chair seat|electrical|wiring|gas line)\b/.test(
      text,
    ) ||
    /\b(missing piece|gap.?fill|bent|warped|deform)\b/.test(text) ||
    /\b(aquarium|submers|underwater|oven|microwave|stovetop)\b/.test(text)
  );
}

function isFoodContactInterior(parsed) {
  const text = blobText(parsed);
  return /\b(food.?safe|food.?contact|eating surface|drinking surface|inside|interior)\b/.test(
    text,
  );
}

function isIncompatiblePlastic(parsed) {
  return /\b(polyethylene|polypropylene|\bpp\b|\bpe\b|ptfe|teflon)\b/.test(
    blobText(parsed),
  );
}

function isUnlabeledPlastic(parsed) {
  const text = blobText(parsed);
  if (!/\bplastic\b/.test(text)) {
    return false;
  }
  if (isIncompatiblePlastic(parsed)) {
    return false;
  }
  return !/\b(abs|pvc|acrylic|polycarbonate|polystyrene|hard rigid|hard plastic)\b/.test(
    text,
  );
}

function isMugOrChina(parsed) {
  return /\b(mug|cup|china|porcelain|ceramic|figurine)\b/.test(blobText(parsed));
}

function damageText(parsed, userNote) {
  return `${parsed.damage || ""} ${parsed.damage_type || ""} ${userNote || ""}`.toLowerCase();
}

function isFabricOnlyShoeDamage(parsed, userNote) {
  const damage = damageText(parsed, userNote);
  const fabricTear = /\b(tear|rip|hole|fray|ripped canvas|torn (upper|fabric|canvas))\b/.test(
    damage,
  );
  const soleDamage = /\b(sole|peel|separat|detach|toe (cap|bumper))\b/.test(damage);
  return fabricTear && !soleDamage;
}

function isShoeSoleCase(parsed, userNote) {
  const text = `${blobText(parsed)} ${userNote || ""}`.toLowerCase();
  const damage = damageText(parsed, userNote);
  if (isFabricOnlyShoeDamage(parsed, userNote)) {
    return false;
  }
  return (
    /\b(shoe|sneaker|trainer|footwear|boot|loafer)\b/.test(text) &&
    /\b(sole|peel|separat|detach|toe (cap|bumper))\b/.test(damage)
  );
}

function isLoadBearingRepair(parsed) {
  const text = blobText(parsed);
  if (/\b(load.?bearing|ladder|chair seat|stool seat|step stool)\b/.test(text)) {
    return true;
  }
  return (
    /\b(chair|stool|bench)\b/.test(text) &&
    /\b(seat|rung|leg)\b/.test(text) &&
    /\b(crack|break|split|splinter|structural)\b/.test(text) &&
    !/\b(accent|trim|veneer|decoration|figurine)\b/.test(text)
  );
}

function isFoodContactRepair(parsed) {
  const text = blobText(parsed);
  if (isFoodContactInterior(parsed)) {
    return true;
  }
  const vessel = /\b(mug|cup|bowl|plate|dish|bottle)\b/.test(text);
  const interior = /\b(inside|interior|internal|inner (wall|surface)|drinking|eating|food.contact)\b/.test(
    text,
  );
  const handleOnly = /\bhandle\b/.test(text) && !interior;
  return vessel && interior && !handleOnly;
}

function isUnidentifiable(parsed) {
  const object = String(parsed.object || parsed.item_identified || "").toLowerCase();
  const material = String(parsed.material || "").toLowerCase();
  const damage = String(parsed.damage || parsed.damage_type || "").toLowerCase();
  return (
    /\b(unknown|unclear|unidentif|cannot tell|too dark|too blurry)\b/.test(
      `${object} ${material} ${damage}`,
    ) ||
    (object === "unknown" || material === "unknown")
  );
}

/**
 * Rescue a rubber shoe sole rejected because the upper is fabric, or because
 * the model ignored a note that the damaged part is the sole.
 * Never rescue a fabric-only tear.
 */
function fabricSoleFalseNegative(parsed, userNote) {
  if (
    hasSafetyOrIncompatibleReason(parsed) ||
    isFoodContactRepair(parsed) ||
    isLoadBearingRepair(parsed) ||
    isFabricOnlyShoeDamage(parsed, userNote)
  ) {
    return false;
  }
  return isShoeSoleCase(parsed, userNote);
}

function knownYesRepair(parsed, userNote) {
  if (!fabricSoleFalseNegative(parsed, userNote)) {
    return null;
  }
  if (parseSuitable(parsed, parseGrams(parsed.grams ?? parsed.grams_needed))) {
    return null;
  }
  return {
    grams: 1,
    why: "Universal Super Glue bonds the rubber sole. A fabric upper does not make this repair a no.",
    tips: defaultRepairTips(parsed.object || "the shoe", parsed.material || "rubber"),
  };
}

function ceramicNoteConflict(parsed, userNote) {
  const note = String(userNote || "");
  const noteSaysPlastic =
    /\bplastic\b/i.test(note) && !/\b(ceramic|china|porcelain)\b/i.test(note);
  return (
    noteSaysPlastic &&
    isMugOrChina(parsed) &&
    !isIncompatiblePlastic(parsed) &&
    !isFoodContactRepair(parsed) &&
    !isLoadBearingRepair(parsed)
  );
}

function ceramicCorrection(userMessage) {
  const text = String(userMessage || "");
  if (/ceramic rather than plastic|looks like ceramic|glazed ceramic rather than plastic/i.test(text)) {
    return text;
  }
  return "Looking at the photo, this actually looks like ceramic rather than plastic — good news, ceramic bonds really well with Universal Super Glue. ";
}

function isHardNo(parsed, userNote) {
  const text = blobText(parsed);
  if (
    hasSafetyOrIncompatibleReason(parsed) ||
    isFoodContactRepair(parsed) ||
    isLoadBearingRepair(parsed) ||
    isUnidentifiable(parsed) ||
    isFabricOnlyShoeDamage(parsed, userNote)
  ) {
    return true;
  }
  if (/\bglass\b/.test(text) && !/\b(mug|ceramic|porcelain|china)\b/.test(text)) {
    return true;
  }
  if (
    /\b(cotton|wool|fabric|canvas|textile)\b/.test(text) &&
    !/\b(sole|rubber|shoe|sneaker)\b/.test(text)
  ) {
    return true;
  }
  return false;
}

function isUncertainGuess(parsed) {
  const confidence = String(parsed.confidence || "").toLowerCase();
  const reason = `${parsed.reason || ""} ${parsed.why || ""}`;
  if (confidence === "low") {
    return true;
  }
  return /unclear|too dark|ambiguous|cannot identify|could not identify|recycling (code|symbol)|clearer photo|better (light|photo)/i.test(
    reason,
  );
}

function parseGrams(value) {
  if (value == null || value === "") {
    return null;
  }
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeAdvice(parsed, userNote) {
  let object = firstPresent(parsed.object, parsed.item_identified);
  let material = firstPresent(parsed.material);
  const damage = firstPresent(parsed.damage, parsed.damage_type);
  let reason = firstPresent(parsed.reason);
  const facts = { ...parsed, object, material, damage, reason };
  const known = knownYesRepair(facts, userNote);
  let tips = Array.isArray(parsed.tips) ? parsed.tips.map(String).filter(Boolean) : [];
  if (!tips.length) {
    tips = extractSteps(parsed.user_message);
  }
  let why = displayWhy(parsed.user_message, firstPresent(parsed.why));
  let grams = parseGrams(parsed.grams ?? parsed.grams_needed);
  let suitable = parseSuitable(parsed, grams);
  let userMessage = firstPresent(parsed.user_message) || null;

  if (isUnlabeledPlastic(facts) && String(parsed.confidence || "").toLowerCase() !== "high") {
    suitable = false;
    grams = null;
    reason =
      reason ||
      "unlabeled plastic — ask for the recycling symbol before recommending Universal Super Glue";
  }

  if (isHardNo(facts, userNote) || isUncertainGuess(facts)) {
    suitable = false;
    grams = null;
    if (isUncertainGuess(facts) && !reason) {
      reason =
        "unclear/low-confidence image — ask for a clearer photo or the recycling symbol before recommending Universal Super Glue";
    }
  } else if (ceramicNoteConflict(facts, userNote)) {
    suitable = true;
    object = object || "ceramic mug";
    material = /ceramic|china|porcelain/i.test(material)
      ? material
      : "glazed ceramic";
    why =
      "Looking at the photo, this actually looks like ceramic rather than plastic — good news, ceramic bonds really well with Universal Super Glue.";
    userMessage = `${ceramicCorrection(userMessage)}${userMessage && !/ceramic rather than plastic/i.test(userMessage) ? userMessage : ""}`.trim();
  } else if (!suitable && known) {
    suitable = true;
    grams = known.grams;
    why = known.why;
    tips = known.tips;
    material = /rubber|sole/i.test(material) ? material : "rubber sole";
  }

  if (suitable && (grams == null || grams <= 0)) {
    grams = known?.grams || 1;
  }

  if (!suitable) {
    return {
      status: "resolved",
      object,
      material,
      damage,
      suitable: false,
      fixable: false,
      grams: null,
      tips: UNSUITABLE_TIPS,
      recommended_product: "",
      why: reason || why || UNSUITABLE_WHY,
      reason: reason || why || UNSUITABLE_WHY,
      user_message: null,
      user_note: userNote || "",
    };
  }

  grams = Math.max(0.05, Math.round(grams * 10) / 10);
  if (!tips.length) {
    tips = defaultRepairTips(object, material);
  }

  return {
    status: "resolved",
    object,
    material,
    damage,
    suitable: true,
    fixable: true,
    grams,
    tips,
    recommended_product: `${PRODUCT_NAME} (${grams} g)`,
    why:
      why ||
      `About ${grams} g of Universal Super Glue is enough for this close-fitting repair — one 3 g tube covers it.`,
    reason: null,
    user_message: userMessage,
    user_note: userNote || "",
  };
}

function errorText(error) {
  return `${error?.message || ""} ${error?.status || ""} ${error?.code || ""}`;
}

function isQuotaError(error) {
  const status = error?.status || error?.code;
  const text = errorText(error);
  return (
    status === 429 ||
    /credits remaining|insufficient_quota|resource.?exhausted|RESOURCE_EXHAUSTED/i.test(
      text,
    )
  );
}

function isUnavailableError(error) {
  const status = error?.status || error?.code;
  return (
    status === 503 ||
    /UNAVAILABLE|high demand|try again later|overloaded|temporarily/i.test(
      errorText(error),
    )
  );
}

function isJsonParseError(error) {
  return (
    error instanceof SyntaxError ||
    /unterminated string|unexpected end of json|invalid json/i.test(
      error?.message || "",
    )
  );
}

function isTimeoutError(error) {
  return (
    error?.name === "AbortError" ||
    error?.code === "ETIMEDOUT" ||
    error?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    /abort|timed? ?out|fetch failed|socket hang up|network/i.test(errorText(error))
  );
}

function isTransientError(error) {
  return (
    isUnavailableError(error) ||
    isQuotaError(error) ||
    isJsonParseError(error) ||
    isTimeoutError(error)
  );
}

function tokenCount(response) {
  const usage = response?.usageMetadata;
  if (usage?.totalTokenCount != null) {
    return Number(usage.totalTokenCount);
  }
  const prompt = Number(usage?.promptTokenCount || 0);
  const output = Number(usage?.candidatesTokenCount || 0);
  const total = prompt + output;
  return total > 0 ? total : null;
}

const CLASSIFIER_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING" },
    item_identified: { type: "STRING" },
    material: { type: "STRING" },
    damage_type: { type: "STRING" },
    damage_size_estimate_cm: { type: "NUMBER" },
    fixable: { type: "BOOLEAN" },
    grams_needed: { type: "NUMBER" },
    tubes_needed: { type: "INTEGER" },
    confidence: { type: "STRING" },
    reason: { type: "STRING" },
    clarifying_question: { type: "STRING" },
    suggested_answers: { type: "ARRAY", items: { type: "STRING" } },
    allow_custom_answer: { type: "BOOLEAN" },
    user_message: { type: "STRING" },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["status", "item_identified", "material", "damage_type", "confidence"],
};

function classifierParts(image, message, followUp) {
  const { mimeType, data } = parseImage(image);
  const parts = [{ inlineData: { mimeType, data } }];
  if (typeof message === "string" && message.length > 0) {
    parts.push({ text: message });
  }
  if (followUp?.answer) {
    const lines = [];
    if (followUp.question) {
      lines.push(`Clarifying question: ${followUp.question}`);
    }
    lines.push(`User answer: ${followUp.answer}`);
    parts.push({ text: lines.join("\n") });
  }
  return parts;
}

async function analyzeWithGemini(image, message, options = {}) {
  // Always call Gemini first. Never short-circuit to clarification from
  // image-quality or other app rules — Step 2 of the prompt owns that call.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const { scanId, followUp } = options;
  const isFollowUp = Boolean(followUp?.answer);
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const call1 = await generateClassifierResult(ai, model, image, message, followUp);
  const interpreted = interpretClassifier(call1.parsed, {
    userNote: message,
    isFollowUp,
    scanId,
  });

  if (interpreted.kind === "clarification") {
    return {
      parsed: interpreted.result,
      classifierTokens: call1.tokens,
      fallbackTokens: null,
      outcome: interpreted.outcome,
    };
  }

  let parsed = interpreted.result;
  let fallbackTokens = null;

  if (parsed.suitable === false) {
    try {
      const call2 = await generateFallbackMessage(ai, model, parsed, message);
      const text = call2.text || UNSUITABLE_WHY;
      parsed = {
        ...parsed,
        why: text,
        user_message: text,
      };
      fallbackTokens = call2.tokens;
    } catch (error) {
      console.warn("Gemini fallback message failed:", error?.message || error);
      parsed = {
        ...parsed,
        why: UNSUITABLE_WHY,
        user_message: UNSUITABLE_WHY,
      };
    }
  }

  return {
    parsed,
    classifierTokens: call1.tokens,
    fallbackTokens,
    outcome:
      interpreted.outcome || (parsed.suitable ? "fixable" : "not_fixable"),
  };
}

async function generateClassifierResult(ai, model, image, message, followUp) {
  const budget = timeoutBudget(CLASSIFIER_TIMEOUT_MS);
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: classifierParts(image, message, followUp),
        },
      ],
      config: {
        systemInstruction: classifierPrompt(),
        responseMimeType: "application/json",
        responseJsonSchema: CLASSIFIER_SCHEMA,
        thinkingConfig: { thinkingLevel: "low" },
        temperature: 0,
        maxOutputTokens: 1536,
        abortSignal: budget.signal,
      },
    });
  } finally {
    budget.clear();
  }

  const raw = String(response.text || "");
  console.info("Fix Finder Gemini classifier raw:", raw.slice(0, 600));
  return {
    parsed: parseClassifierJson(raw),
    tokens: tokenCount(response),
  };
}

async function generateFallbackMessage(ai, model, parsed, userNote) {
  const payload = {
    item_identified: parsed.object,
    material: parsed.material,
    damage_type: parsed.damage,
    reason: parsed.reason || parsed.why,
  };
  if (typeof userNote === "string" && userNote.length > 0) {
    payload.user_note = userNote;
  }
  const budget = timeoutBudget(FALLBACK_TIMEOUT_MS);
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(payload) }],
        },
      ],
      config: {
        systemInstruction: fallbackPrompt(),
        thinkingConfig: { thinkingLevel: "minimal" },
        temperature: 0.2,
        maxOutputTokens: 512,
        abortSignal: budget.signal,
      },
    });
  } finally {
    budget.clear();
  }

  const text = String(response.text || "").trim();
  console.info("Fix Finder Gemini fallback raw:", text.slice(0, 400));
  return {
    text,
    tokens: tokenCount(response),
  };
}

export const maxDuration = 60;

const MAX_IMAGE_CHARS = 1_500_000;
const MAX_MESSAGE_CHARS = 500;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitHits = new Map();

function clientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function allowRequest(ip) {
  const now = Date.now();
  const recent = (rateLimitHits.get(ip) || []).filter(
    (stamp) => now - stamp < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }
  recent.push(now);
  rateLimitHits.set(ip, recent);
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const image = typeof body.image === "string" ? body.image : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const clarifyingQuestion =
      typeof body.clarifying_question === "string"
        ? body.clarifying_question.trim()
        : "";
    const clarifyingAnswer =
      typeof body.clarifying_answer === "string"
        ? body.clarifying_answer.trim()
        : "";
    const isFollowUp = clarifyingAnswer.length > 0;
    const scanId =
      typeof body.scan_id === "string" && body.scan_id.trim()
        ? body.scan_id.trim().slice(0, 80)
        : crypto.randomUUID();
    const followUp = isFollowUp
      ? { question: clarifyingQuestion, answer: clarifyingAnswer }
      : null;

    if (!allowRequest(clientIp(request))) {
      return Response.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }

    if (!image) {
      return Response.json(
        { error: "Please add a photo." },
        { status: 400 },
      );
    }

    if (
      image.length > MAX_IMAGE_CHARS ||
      message.length > MAX_MESSAGE_CHARS ||
      clarifyingQuestion.length > MAX_MESSAGE_CHARS ||
      clarifyingAnswer.length > MAX_MESSAGE_CHARS
    ) {
      return Response.json(
        { error: "That photo or note is too large. Please try a smaller photo." },
        { status: 413 },
      );
    }

    if (
      process.env.AI_MOCK === "true" ||
      process.env.OPENAI_MOCK === "true"
    ) {
      return Response.json({ result: DEMO_RESULT, demo: true });
    }

    // Call 1: classifier (image). Call 2: rejection copy (text only, not-fixable).
    // Clarification skips Call 2 — there is no verdict yet.
    let analysis = null;
    let lastError = null;

    try {
      analysis = await analyzeWithGemini(image, message, { scanId, followUp });
    } catch (error) {
      lastError = error;
      console.warn("Gemini analysis failed:", error?.message || error);
    }

    const parsed = analysis?.parsed ?? null;

    if (!parsed) {
      const missingKey =
        !process.env.GEMINI_API_KEY &&
        !process.env.GROQ_API_KEY &&
        !process.env.OPENAI_API_KEY;

      if (missingKey) {
        return Response.json(
          { error: "The recommendation service is not available. Please try again later." },
          { status: 500 },
        );
      }

      // A busy upstream is the common case, and it usually clears on a retry —
      // say so, instead of implying the app is broken.
      if (lastError && isTimeoutError(lastError)) {
        return Response.json(
          {
            error:
              "Our photo analysis is unusually busy right now. Please tap Let's fix it again — it normally works on the next try.",
          },
          { status: 503 },
        );
      }

      return Response.json(
        { error: "We could not complete the analysis. Please try again in a moment." },
        { status: lastError && isTransientError(lastError) ? 503 : 500 },
      );
    }

    const result = { ...parsed, scan_id: scanId };

    console.info("Fix Finder advice:", {
      status: result.status,
      outcome: analysis.outcome,
      suitable: result.suitable,
      grams: result.grams,
      object: result.object,
      scan_id: scanId,
      classifier_tokens: analysis.classifierTokens,
      fallback_tokens: analysis.fallbackTokens,
    });

    try {
      await insertLog({
        user_context: followUp
          ? [message, followUp.question && `Q: ${followUp.question}`, `A: ${followUp.answer}`]
              .filter(Boolean)
              .join(" | ")
          : message,
        object: result.object,
        material: result.material,
        damage: result.damage,
        recommended_product: result.recommended_product,
        classifier_tokens: analysis.classifierTokens,
        fallback_tokens: analysis.fallbackTokens,
        outcome: analysis.outcome,
        scan_id: scanId,
        scan_round: followUp ? "follow_up" : "initial",
      });
    } catch (saveError) {
      console.error("Failed to save scan to Supabase:", saveError);
    }

    return Response.json({ result, scan_id: scanId });
  } catch (error) {
    console.error("POST /api/ask failed:", error);

    return Response.json(
      {
        error: "We could not complete the analysis. Please try again in a moment.",
      },
      { status: isTransientError(error) ? 503 : 500 },
    );
  }
}
