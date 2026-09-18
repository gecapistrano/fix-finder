import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { saveApprovedPost } from "@/lib/posts";
import { insertLog } from "@/lib/supabaseClient";

const MAX_IMAGE_CHARS = 1_500_000;
const MAX_TEXT_CHARS = 800;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 12;
const rateLimitHits = new Map();

const GENERIC_REJECT =
  "We cannot publish this post. Please share a genuine before-and-after repair story.";
const REVIEW_UNAVAILABLE =
  "We could not review this post right now. Please try again in a moment.";

// Gemini latency is spiky under load. Cap our own wait inside `maxDuration` so
// a slow review fails cleanly and retryably instead of being killed mid-flight.
const MODERATOR_TIMEOUT_MS = 45_000;

function timeoutBudget(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

const MODERATOR_SCHEMA = {
  type: "OBJECT",
  properties: {
    decision: { type: "STRING" },
    categories: { type: "ARRAY", items: { type: "STRING" } },
    user_reason: { type: "STRING" },
    internal_reason: { type: "STRING" },
  },
  required: ["decision"],
};

function loadPrompt() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "community-moderator-system-prompt.md"),
    join(process.cwd(), "app", "api", "moderate", "community-moderator-system-prompt.md"),
  ];
  for (const file of candidates) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      // Vercel and local cwd can differ.
    }
  }
  throw new Error("Missing community moderator prompt.");
}

function parseImage(image) {
  const trimmed = String(image || "").trim();
  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
  }
  return { mimeType: "image/jpeg", data: trimmed };
}

function parseModeratorJson(raw) {
  const stripped = String(raw || "")
    .replace(/^\s*`{3}(?:json)?\s*/i, "")
    .replace(/\s*`{3}\s*$/i, "")
    .trim();
  const parsed = JSON.parse(stripped);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid moderator json");
  }
  const decision =
    String(parsed.decision || "").trim().toLowerCase() === "allow"
      ? "allow"
      : "reject";
  const categories = Array.isArray(parsed.categories)
    ? parsed.categories.map((entry) => String(entry).trim()).filter(Boolean)
    : [];
  const userReason = String(parsed.user_reason || "").trim();
  return {
    allowed: decision === "allow",
    decision,
    categories,
    user_reason:
      decision === "allow"
        ? null
        : userReason || GENERIC_REJECT,
    internal_reason: String(parsed.internal_reason || "").trim() || null,
  };
}

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

function tokenCount(response) {
  const usage = response?.usageMetadata;
  if (usage?.totalTokenCount != null) {
    return Number(usage.totalTokenCount);
  }
  return null;
}

async function persistPost(post) {
  try {
    return await saveApprovedPost(post);
  } catch (error) {
    console.warn("Could not save community post to Supabase:", error?.message || error);
    return null;
  }
}

async function reviewPost(body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const before = parseImage(body.before);
  const after = parseImage(body.after);
  const text = [
    `Title: ${body.title}`,
    body.author ? `Author: ${body.author}` : null,
    body.product ? `Product: ${body.product}` : null,
    `Caption: ${body.note}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const budget = timeoutBudget(MODERATOR_TIMEOUT_MS);
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Before photo:" },
            { inlineData: { mimeType: before.mimeType, data: before.data } },
            { text: "After photo:" },
            { inlineData: { mimeType: after.mimeType, data: after.data } },
            { text },
          ],
        },
      ],
      config: {
        systemInstruction: loadPrompt(),
        responseMimeType: "application/json",
        responseJsonSchema: MODERATOR_SCHEMA,
        thinkingConfig: { thinkingLevel: "minimal" },
        temperature: 0,
        maxOutputTokens: 256,
        abortSignal: budget.signal,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      },
    });
  } finally {
    budget.clear();
  }

  const raw = String(response.text || "");
  console.info("Community moderator raw:", raw.slice(0, 400));
  return {
    ...parseModeratorJson(raw),
    tokens: tokenCount(response),
  };
}

export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : "";
    const product = typeof body.product === "string" ? body.product.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const before = typeof body.before === "string" ? body.before : "";
    const after = typeof body.after === "string" ? body.after : "";

    if (!allowRequest(clientIp(request))) {
      return Response.json(
        { error: "Too many posts. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }

    if (!title || !note || !before || !after) {
      return Response.json(
        { error: "Please add a title, both photos, and your story." },
        { status: 400 },
      );
    }

    if (
      title.length > MAX_TEXT_CHARS ||
      author.length > 40 ||
      product.length > MAX_TEXT_CHARS ||
      note.length > MAX_TEXT_CHARS ||
      before.length > MAX_IMAGE_CHARS ||
      after.length > MAX_IMAGE_CHARS
    ) {
      return Response.json(
        { error: "That story or photo is too large. Please try a shorter note or smaller photos." },
        { status: 413 },
      );
    }

    if (process.env.AI_MOCK === "true" || process.env.OPENAI_MOCK === "true") {
      const saved = await persistPost({ title, author, product, note, before, after });
      return Response.json({
        allowed: true,
        decision: "allow",
        categories: [],
        user_reason: null,
        demo: true,
        saved: Boolean(saved),
        post: saved,
      });
    }

    let review = null;
    try {
      review = await reviewPost({ title, author, product, note, before, after });
    } catch (error) {
      const blockedBySafety =
        /blocked|safety|SAFETY/i.test(error?.message || "") ||
        error?.promptFeedback?.blockReason;
      if (blockedBySafety) {
        review = {
          allowed: false,
          decision: "reject",
          categories: ["other"],
          user_reason: GENERIC_REJECT,
          internal_reason: "gemini_safety_block",
          tokens: null,
        };
      } else {
        console.warn("Community moderator failed:", error?.message || error);
      }
    }

    if (!review) {
      return Response.json({ error: REVIEW_UNAVAILABLE }, { status: 503 });
    }

    try {
      await insertLog({
        user_context: [title, note].filter(Boolean).join(" — ").slice(0, 500),
        object: "community_post",
        material: review.decision,
        damage: (review.categories || []).join(",") || "",
        recommended_product: product,
        outcome: review.allowed ? "post_allowed" : "post_rejected",
        scan_round: "initial",
        classifier_tokens: review.tokens,
        fallback_tokens: null,
      });
    } catch (saveError) {
      console.error("Failed to save moderation log:", saveError);
    }

    console.info("Community moderator:", {
      decision: review.decision,
      categories: review.categories,
      tokens: review.tokens,
    });

    let saved = null;
    if (review.allowed) {
      saved = await persistPost({ title, author, product, note, before, after });
    }

    return Response.json({
      allowed: review.allowed,
      decision: review.decision,
      categories: review.categories,
      user_reason: review.user_reason,
      saved: Boolean(saved),
      post: saved,
    });
  } catch (error) {
    console.error("POST /api/moderate failed:", error);
    return Response.json({ error: REVIEW_UNAVAILABLE }, { status: 500 });
  }
}
