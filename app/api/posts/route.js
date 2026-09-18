import { listPosts } from "@/lib/posts";

export async function GET() {
  try {
    const posts = await listPosts();
    return Response.json({ posts });
  } catch (error) {
    console.warn("GET /api/posts failed:", error?.message || error);
    return Response.json({ posts: [], error: "unavailable" }, { status: 200 });
  }
}
