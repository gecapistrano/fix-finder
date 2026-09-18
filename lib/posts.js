import { getSupabase } from "./supabaseClient";

const BUCKET = "community-posts";

const HIDDEN_TEST_POSTS = new Set([
  "e1630b77-f17c-4088-af26-a58b71750ed8",
  "afca672b-fa51-4dd1-b6ba-5319b4afa7ba",
  "12a6e58e-6e51-410a-be1b-46bb2773ec3e",
  "51ece9f1-7804-48d4-8844-ebd308f7bd56",
]);

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (!match) {
    return null;
  }
  const mime = match[1].toLowerCase();
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return {
    mime: mime.includes("png") ? "image/png" : mime.includes("webp") ? "image/webp" : "image/jpeg",
    ext,
    bytes: Buffer.from(match[2], "base64"),
  };
}

export function mapPost(row) {
  return {
    id: row.id,
    title: row.title || "",
    author: row.author || "",
    product: row.product || "",
    note: row.note || "",
    before: row.before_url,
    after: row.after_url,
  };
}

export async function saveApprovedPost(post) {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const before = parseDataUrl(post.before);
  const after = parseDataUrl(post.after);
  if (!before || !after) {
    throw new Error("Both photos are required.");
  }

  const beforePath = `${id}/before.${before.ext}`;
  const afterPath = `${id}/after.${after.ext}`;

  const uploadedBefore = await supabase.storage.from(BUCKET).upload(beforePath, before.bytes, {
    contentType: before.mime,
    upsert: false,
  });
  if (uploadedBefore.error) {
    throw uploadedBefore.error;
  }

  const uploadedAfter = await supabase.storage.from(BUCKET).upload(afterPath, after.bytes, {
    contentType: after.mime,
    upsert: false,
  });
  if (uploadedAfter.error) {
    throw uploadedAfter.error;
  }

  const beforeUrl = supabase.storage.from(BUCKET).getPublicUrl(beforePath).data.publicUrl;
  const afterUrl = supabase.storage.from(BUCKET).getPublicUrl(afterPath).data.publicUrl;

  const row = {
    id,
    title: post.title,
    author: post.author || "",
    product: post.product || "",
    note: post.note,
    before_url: beforeUrl,
    after_url: afterUrl,
  };

  const { error } = await supabase.from("posts").insert(row);
  if (error) {
    throw error;
  }

  return mapPost(row);
}

export async function listPosts() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select("id, created_at, title, author, product, note, before_url, after_url")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    throw error;
  }

  return (data || [])
    .map(mapPost)
    .filter((post) => !HIDDEN_TEST_POSTS.has(post.id));
}

export async function getPost(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select("id, created_at, title, author, product, note, before_url, after_url")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data || HIDDEN_TEST_POSTS.has(data.id)) {
    return null;
  }
  return mapPost(data);
}
