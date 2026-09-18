import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const instanceOutcomeCounts = {
  initial: 0,
  clarification_requested: 0,
};

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the dev server.",
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function appendLocalScan(data) {
  const dir = path.join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await appendFile(
    path.join(dir, "scans.jsonl"),
    `${JSON.stringify({
      ...data,
      created_at: new Date().toISOString(),
    })}\n`,
  );
}

/**
 * Insert one row into the "scans" table.
 * If the hosted table does not exist yet, log locally so the API still succeeds.
 */
export async function insertLog(data) {
  const row = {
    user_context: data.user_context ?? "",
    object: data.object ?? "",
    material: data.material ?? "",
    damage: data.damage ?? "",
    recommended_product: data.recommended_product ?? "",
    classifier_tokens: data.classifier_tokens ?? null,
    fallback_tokens: data.fallback_tokens ?? null,
    outcome: data.outcome ?? null,
    scan_id: data.scan_id ?? null,
    scan_round: data.scan_round ?? null,
  };

  noteInstanceOutcome(row);

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("scans").insert(row);

    if (!error) {
      await logClarificationRate();
      return;
    }

    if (error.code === "PGRST205" || error.code === "PGRST204" || error.code === "42703") {
      await appendLocalScan(row);
      console.warn(
        "Supabase could not store extra scan columns yet. Saved this scan to .data/scans.jsonl. Run supabase/migrations/002_scan_token_usage.sql and 003_scan_outcome.sql if columns are missing.",
      );
      await logClarificationRate();
      return;
    }

    throw error;
  } catch (error) {
    if (error?.code === "PGRST205" || error?.code === "PGRST204" || error?.code === "42703") {
      await appendLocalScan(row);
      await logClarificationRate();
      return;
    }
    throw error;
  }
}

function noteInstanceOutcome(row) {
  if (row.scan_round === "follow_up") {
    return;
  }
  instanceOutcomeCounts.initial += 1;
  if (row.outcome === "clarification_requested") {
    instanceOutcomeCounts.clarification_requested += 1;
  }
}

function summarizeClarificationRate(rows) {
  const initial = rows.filter(
    (row) =>
      (row.scan_round || "initial") === "initial" && row.outcome,
  );
  const clarification_requested = initial.filter(
    (row) => row.outcome === "clarification_requested",
  ).length;
  const initial_scans = initial.length;
  return {
    clarification_requested,
    initial_scans,
    rate:
      initial_scans > 0
        ? Number((clarification_requested / initial_scans).toFixed(4))
        : null,
  };
}

async function rateFromJsonl() {
  try {
    const file = path.join(process.cwd(), ".data", "scans.jsonl");
    const text = await readFile(file, "utf8");
    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return summarizeClarificationRate(rows);
  } catch {
    return null;
  }
}

/**
 * Running share of first-round scans that asked a clarifying question.
 * A high rate means tighten the classifier prompt — not the feature.
 */
async function logClarificationRate() {
  let stats = null;
  let source = "instance";

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("scan_clarification_rate");
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row && row.initial_scans != null) {
      stats = {
        clarification_requested: Number(row.clarification_requested) || 0,
        initial_scans: Number(row.initial_scans) || 0,
        rate:
          row.rate == null
            ? null
            : Number(row.rate),
      };
      source = "supabase";
    }
  } catch {
    // RPC is missing until 003_scan_outcome.sql is applied.
  }

  if (!stats) {
    stats = await rateFromJsonl();
    if (stats) {
      source = "jsonl";
    }
  }

  if (!stats || !stats.initial_scans) {
    stats = {
      clarification_requested: instanceOutcomeCounts.clarification_requested,
      initial_scans: instanceOutcomeCounts.initial,
      rate:
        instanceOutcomeCounts.initial > 0
          ? Number(
              (
                instanceOutcomeCounts.clarification_requested /
                instanceOutcomeCounts.initial
              ).toFixed(4),
            )
          : null,
    };
    source = "instance";
  }

  console.info("Fix Finder clarification rate:", {
    ...stats,
    source,
    note:
      "If this rate is high, tighten Step 2 of the classifier prompt — do not add app heuristics.",
  });
}
