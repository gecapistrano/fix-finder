const KEY = "fixfinder-community-posts";

export function clearLegacyTestPosts() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const flag = "fixfinder-community-posts-cleared-2026-09-04";
    if (window.localStorage.getItem(flag)) {
      return;
    }
    window.localStorage.removeItem(KEY);
    window.localStorage.setItem(flag, "1");
  } catch {
    // Storage may be blocked.
  }
}

export function readCommunityPosts() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCommunityPost(post) {
  const posts = readCommunityPosts();
  posts.unshift(post);
  const payload = JSON.stringify(posts.slice(0, 40));
  try {
    window.localStorage.setItem(KEY, payload);
  } catch {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(posts.slice(0, 6)));
    } catch {
      throw new Error("storage-full");
    }
  }
}
