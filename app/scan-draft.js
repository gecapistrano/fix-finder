const KEY = "fixfinder-scan-draft";

export function readScanDraft() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      title: String(parsed.title || ""),
      product: String(parsed.product || ""),
      before: String(parsed.before || ""),
    };
  } catch {
    return null;
  }
}

export function saveScanDraft(draft) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({
        title: String(draft.title || ""),
        product: String(draft.product || ""),
        before: String(draft.before || ""),
      }),
    );
  } catch {
    // sessionStorage can be blocked or over quota.
  }
}

export function clearScanDraft() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // sessionStorage can be blocked in private mode.
  }
}
