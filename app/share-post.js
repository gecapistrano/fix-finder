import { copy } from "./copy";
import { SUPER_GLUE_IMAGE } from "./products";

const ACCENT_RED = "#dc2626";
const INK = "#3b3b3b";
const MUTED = "#717171";
const PAPER = "#f6f6f6";
const WHITE = "#ffffff";
const SOFT = "#fff2f2";

export const POST_SHARE_OPTIONS = [
  {
    id: "download",
    format: "square",
    fileTag: "fix",
    preferDownload: true,
  },
  {
    id: "fb-story",
    format: "story",
    fileTag: "facebook-story",
    preferDownload: false,
  },
  {
    id: "fb-post",
    format: "post",
    fileTag: "facebook-post",
    preferDownload: false,
  },
  {
    id: "ig-story",
    format: "story",
    fileTag: "instagram-story",
    preferDownload: false,
  },
  {
    id: "ig-post",
    format: "post",
    fileTag: "instagram-post",
    preferDownload: false,
  },
];

const SIZES = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

function authorName(post) {
  const name = typeof post?.author === "string" ? post.author.trim() : "";
  return name || copy.anonymous;
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!String(src).startsWith("data:") && !String(src).startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    lines.push(line);
  }
  if (!maxLines || lines.length <= maxLines) {
    return lines;
  }
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  kept[maxLines - 1] = `${last.replace(/\s+$/, "")}…`;
  return kept;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCover(ctx, img, x, y, width, height, radius) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.clip();
  if (img) {
    const scale = Math.max(width / img.width, height / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#e8e4e3";
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

function drawLabel(ctx, text, x, y, variant) {
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  const padX = 14;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 36;
  ctx.fillStyle = variant === "after" ? ACCENT_RED : "rgba(0,0,0,0.62)";
  roundedRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.fillText(text, x + padX, y + 26);
}

function drawPlaceholder(ctx, x, y, width, height, radius) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = "#f4e8e8";
  ctx.fill();
  ctx.fillStyle = ACCENT_RED;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(x + width * 0.7, y + height * 0.35, Math.min(width, height) * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPhoto(ctx, img, label, x, y, width, height, variant) {
  if (img) {
    drawCover(ctx, img, x, y, width, height, 28);
  } else {
    drawPlaceholder(ctx, x, y, width, height, 28);
  }
  drawLabel(ctx, label, x + 18, y + 18, variant);
}

function drawHashPill(ctx, x, y) {
  ctx.font = "bold 26px Helvetica, Arial, sans-serif";
  const text = copy.shareHashtag;
  const w = ctx.measureText(text).width + 36;
  ctx.fillStyle = ACCENT_RED;
  roundedRect(ctx, x, y, w, 48, 24);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.fillText(text, x + 18, y + 33);
}

function drawPill(ctx, text, x, y) {
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  const padX = 16;
  const w = Math.min(ctx.measureText(text).width + padX * 2, 960);
  const h = 40;
  ctx.fillStyle = SOFT;
  roundedRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.fillStyle = ACCENT_RED;
  ctx.fillText(text, x + padX, y + 28);
  return h;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create the file."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function canShareFiles(file) {
  try {
    return Boolean(navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

function captionFor(post) {
  const title = String(post?.title || "").trim();
  return [title, copy.shareHashtag].filter(Boolean).join(" ");
}

function drawBrandLockup(ctx, x, y) {
  ctx.font = "bold 34px Helvetica, Arial, sans-serif";
  ctx.fillStyle = ACCENT_RED;
  ctx.fillText(copy.brand, x, y);
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  ctx.fillStyle = ACCENT_RED;
  ctx.fillText(copy.shareHashtag, x, y + 36);
  return 52;
}

function drawFooterMeta(ctx, post, pack, x, y, maxWidth) {
  let cursor = y;
  if (post.product) {
    drawPill(ctx, post.product, x, cursor);
    cursor += 56;
  }
  if (pack) {
    const packH = 72;
    const packW = Math.round((pack.width / pack.height) * packH);
    ctx.drawImage(pack, x, cursor, packW, packH);
    ctx.font = "22px Helvetica, Arial, sans-serif";
    ctx.fillStyle = MUTED;
    const label = `${copy.realResultsLead} ${copy.brand}`;
    ctx.fillText(label, x + packW + 16, cursor + 44);
    cursor += packH + 8;
  }
  ctx.font = "italic 24px Helvetica, Arial, sans-serif";
  ctx.fillStyle = ACCENT_RED;
  const hashLines = wrapLines(ctx, copy.shareHashtag, maxWidth, 1);
  ctx.fillText(hashLines[0] || copy.shareHashtag, x, cursor + 28);
}

function drawQrBlock(ctx, qr, x, y, size) {
  const frame = 14;
  const box = size + frame * 2;
  ctx.fillStyle = WHITE;
  roundedRect(ctx, x, y, box, box, 18);
  ctx.fill();
  ctx.strokeStyle = ACCENT_RED;
  ctx.lineWidth = 5;
  roundedRect(ctx, x, y, box, box, 18);
  ctx.stroke();
  if (qr) {
    ctx.drawImage(qr, x + frame, y + frame, size, size);
  } else {
    ctx.fillStyle = SOFT;
    ctx.fillRect(x + frame, y + frame, size, size);
  }
}

function paintCard(ctx, width, height, post, before, after, pack, qr, kind) {
  const pad = kind === "story" ? 48 : 52;
  const headerH = kind === "story" ? 168 : 120;
  const qrSize = kind === "story" ? 168 : 132;
  const qrBox = qrSize + 28;
  const footerReserve = qrBox + 56;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#fff7f7");
  grad.addColorStop(1, WHITE);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ACCENT_RED;
  ctx.fillRect(0, 0, width, headerH);
  ctx.font = "bold 36px Helvetica, Arial, sans-serif";
  ctx.fillStyle = WHITE;
  ctx.fillText(copy.brand, pad, kind === "story" ? 78 : 58);
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  ctx.fillText(copy.shareHashtag, pad, kind === "story" ? 122 : 96);

  const gap = 18;
  const photoY = headerH + 36;
  const photoH = kind === "story" ? 860 : kind === "post" ? 500 : 420;
  const photoW = (width - pad * 2 - gap) / 2;
  drawPhoto(ctx, before, copy.before, pad, photoY, photoW, photoH, "before");
  drawPhoto(ctx, after, copy.after, pad + photoW + gap, photoY, photoW, photoH, "after");

  const maxWidth = width - pad * 2 - qrBox - 28;
  let y = photoY + photoH + 62;
  ctx.font = "bold 46px Helvetica, Arial, sans-serif";
  ctx.fillStyle = INK;
  for (const line of wrapLines(ctx, post.title || "A fix worth sharing", maxWidth, 2)) {
    ctx.fillText(line, pad, y);
    y += 54;
  }
  ctx.font = "26px Helvetica, Arial, sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText(`${copy.postedBy} ${authorName(post)}`, pad, y + 4);
  y += 48;
  if (post.note) {
    ctx.font = "28px Helvetica, Arial, sans-serif";
    ctx.fillStyle = INK;
    for (const line of wrapLines(ctx, post.note, maxWidth, kind === "post" ? 3 : 2)) {
      ctx.fillText(line, pad, y);
      y += 36;
    }
    y += 10;
  }
  drawHashPill(ctx, pad, Math.min(y + 6, height - footerReserve - 8));

  const qrX = width - pad - qrBox;
  const qrY = kind === "story" ? height - 400 : height - pad - qrBox;
  drawQrBlock(ctx, qr, qrX, qrY, qrSize);
  ctx.font = "bold 20px Helvetica, Arial, sans-serif";
  ctx.fillStyle = ACCENT_RED;
  ctx.textAlign = "right";
  ctx.fillText(copy.scanToFix, qrX - 16, qrY + qrBox - 8);
  ctx.textAlign = "left";

  if (pack) {
    const packH = 64;
    const packW = Math.round((pack.width / pack.height) * packH);
    ctx.drawImage(pack, pad, height - pad - packH, packW, packH);
  }
}

async function renderSquare(ctx, post, before, after, pack, qr) {
  paintCard(ctx, SIZES.square.width, SIZES.square.height, post, before, after, pack, qr, "square");
}

async function renderPost(ctx, post, before, after, pack, qr) {
  paintCard(ctx, SIZES.post.width, SIZES.post.height, post, before, after, pack, qr, "post");
}

async function renderStory(ctx, post, before, after, pack, qr) {
  paintCard(ctx, SIZES.story.width, SIZES.story.height, post, before, after, pack, qr, "story");
}

export async function renderPostShareCanvas(post, format) {
  const size = SIZES[format] || SIZES.square;
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  const [before, after, pack, qr] = await Promise.all([
    loadImage(post?.before),
    loadImage(post?.after),
    loadImage(SUPER_GLUE_IMAGE),
    loadImage("/api/qr"),
  ]);

  if (format === "story") {
    await renderStory(ctx, post, before, after, pack, qr);
  } else if (format === "post") {
    await renderPost(ctx, post, before, after, pack, qr);
  } else {
    await renderSquare(ctx, post, before, after, pack, qr);
  }
  return canvas;
}

export function postSharePageUrl(post) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const id = String(post?.id || "");
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return `${origin}/community/p/${id}`;
  }
  return `${origin}/community`;
}

function isMobile() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function socialComposerUrl(optionId, pageUrl) {
  const encoded = encodeURIComponent(pageUrl);
  const mobile = isMobile();
  switch (optionId) {
    case "fb-post":
      return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    case "fb-story":
      return mobile
        ? "https://m.facebook.com/stories/create"
        : "https://www.facebook.com/stories/create";
    case "ig-story":
      return mobile ? "instagram://story-camera" : "https://www.instagram.com/create/story";
    case "ig-post":
      return mobile ? "instagram://library" : "https://www.instagram.com/";
    default:
      return pageUrl;
  }
}

function socialFallbackUrl(optionId, pageUrl) {
  if (optionId === "fb-post") {
    return socialComposerUrl("fb-post", pageUrl);
  }
  if (optionId.startsWith("fb")) {
    return "https://www.facebook.com/stories/create";
  }
  if (optionId === "ig-story") {
    return "https://www.instagram.com/create/story";
  }
  return "https://www.instagram.com/";
}

export function openSocialComposer(optionId, pageUrl) {
  const primary = socialComposerUrl(optionId, pageUrl);
  const fallback = socialFallbackUrl(optionId, pageUrl);
  const popup = window.open(primary.startsWith("http") ? primary : fallback, "_blank");
  if (!primary.startsWith("http")) {
    try {
      const frame = document.createElement("iframe");
      frame.setAttribute("hidden", "");
      frame.src = primary;
      document.body.appendChild(frame);
      window.setTimeout(() => frame.remove(), 2500);
    } catch {
      // App scheme is best-effort on web.
    }
  }
  return Boolean(popup);
}

async function copySharePayload(blob, caption) {
  try {
    await navigator.clipboard.writeText(caption);
  } catch {
    // Caption copy is optional.
  }
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    return;
  }
  try {
    const png = await jpegToPng(blob);
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": png }),
    ]);
  } catch {
    // Image clipboard is optional; the downloaded file is the fallback.
  }
}

async function jpegToPng(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    if (!img) {
      return blob;
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return canvasToBlob(canvas, "image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function prepareShareFile(post, optionId) {
  const option = POST_SHARE_OPTIONS.find((entry) => entry.id === optionId);
  if (!option) {
    throw new Error("Unknown share option.");
  }
  const canvas = await renderPostShareCanvas(post, option.format);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
  const filename = `fixfinder-${option.fileTag}.jpg`;
  const file = new File([blob], filename, { type: "image/jpeg" });
  return { option, blob, filename, file };
}

async function uploadShareCard(file) {
  try {
    const body = new FormData();
    body.append("file", file, file.name);
    const response = await fetch("/api/share-card", { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.id) {
      return null;
    }
    const origin = window.location.origin;
    return {
      id: payload.id,
      url: payload.url,
      pageUrl: `${origin}/s/${payload.id}`,
    };
  } catch {
    return null;
  }
}

export async function exportPostShare(post, optionId) {
  const { option, blob, filename, file } = await prepareShareFile(post, optionId);
  if (option.preferDownload) {
    saveBlob(blob, filename);
    return "downloaded";
  }

  const card = await uploadShareCard(file);
  if (card?.url) {
    try {
      await fetch(card.url, { mode: "no-cors", cache: "no-store" });
    } catch {
      // Warming the public image helps Facebook pick it up in the draft.
    }
  }
  const pageUrl = card?.pageUrl || postSharePageUrl(post);
  const caption = [captionFor(post), pageUrl].filter(Boolean).join(" ");
  await copySharePayload(blob, caption);

  if (canShareFiles(file)) {
    try {
      await navigator.share({
        files: [file],
        title: copy.brand,
        text: caption,
        url: pageUrl,
      });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const opened = openSocialComposer(
    optionId.startsWith("fb") ? "fb-post" : optionId,
    pageUrl,
  );
  if (!optionId.startsWith("fb")) {
    saveBlob(blob, filename);
  }
  return opened ? "opened" : "blocked";
}
