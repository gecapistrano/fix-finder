import { getSupabase } from "@/lib/supabaseClient";

const BUCKET = "community-posts";
const MAX_BYTES = 1_800_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const hits = new Map();

function clientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_MAX;
}

export async function POST(request) {
  if (rateLimited(clientKey(request))) {
    return Response.json({ error: "Please wait a moment before sharing again." }, { status: 429 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size < 32) {
      return Response.json({ error: "A photo is required." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "That image is too large to share." }, { status: 413 });
    }
    const type = file.type || "image/jpeg";
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(type)) {
      return Response.json({ error: "Please use a JPG photo." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const bytes = Buffer.from(await file.arrayBuffer());
    const path = `share-cards/${id}.jpg`;
    const supabase = getSupabase();
    const uploaded = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (uploaded.error) {
      throw uploaded.error;
    }

    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return Response.json({ id, url });
  } catch (error) {
    console.warn("POST /api/share-card failed:", error?.message || error);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
}
