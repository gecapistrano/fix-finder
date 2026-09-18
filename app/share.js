import { copy } from "./copy";
import { formatGrams, packsNeeded } from "./products";

const ACCENT_RED = "#dc2626";

function packLine(grams) {
  const n = packsNeeded(grams);
  return n === 1
    ? copy.packNeedOne
    : copy.packNeedMany.replace("{n}", String(n));
}

function gramsPhrase(results) {
  return `${formatGrams(results.grams)} g`;
}

function amountLines(results) {
  if (!results?.suitable) {
    return [copy.notAFit];
  }
  return [
    `${copy.recommendedAmountIs} ${gramsPhrase(results)}`,
    `${packLine(results.grams)} · ${copy.packSize}`,
  ];
}

export function stepsText(results) {
  const tips = results?.tips || [];
  return [
    copy.brand,
    "",
    ...amountLines(results),
    "",
    results?.suitable ? copy.howTo : copy.nextSteps,
    ...tips.map((tip, index) => `${index + 1}. ${tip}`),
    "",
    results?.suitable ? copy.encouragement : copy.supportEncouragement,
  ].join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stepsHtml(results, imageDataUrl) {
  const tips = results?.tips || [];
  const heading = results?.suitable ? copy.howTo : copy.nextSteps;
  const closer = results?.suitable ? copy.encouragement : copy.supportEncouragement;
  const photo = imageDataUrl
    ? `<p><img src="${imageDataUrl}" alt="${escapeHtml(copy.uploadedPhoto)}" width="280" /></p>`
    : "";
  const amounts = results?.suitable
    ? `${escapeHtml(copy.recommendedAmountIs)} <span style="color:${ACCENT_RED}">${escapeHtml(gramsPhrase(results))}</span><br />${escapeHtml(`${packLine(results.grams)} · ${copy.packSize}`)}`
    : escapeHtml(copy.notAFit);
  const steps = tips
    .map((tip) => `<li>${escapeHtml(tip)}</li>`)
    .join("");

  return [
    `<div>`,
    `<p><strong>${escapeHtml(copy.brand)}</strong></p>`,
    photo,
    `<p>${amounts}</p>`,
    `<p><strong>${escapeHtml(heading)}</strong></p>`,
    steps ? `<ol>${steps}</ol>` : "",
    `<p>${escapeHtml(closer)}</p>`,
    `</div>`,
  ].join("");
}

export async function copyStepsToClipboard(results, imageDataUrl) {
  const text = stepsText(results);
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    await navigator.clipboard.writeText(text);
    return;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([stepsHtml(results, imageDataUrl)], {
          type: "text/html",
        }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(text);
  }
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
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
  return lines;
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function layoutRich(ctx, parts, maxWidth) {
  const tokens = parts.flatMap((part) =>
    String(part.text)
      .split(/(\s+)/)
      .filter(Boolean)
      .map((text) => ({ text, color: part.color })),
  );
  const lines = [];
  let current = [];
  let width = 0;
  for (const token of tokens) {
    const w = ctx.measureText(token.text).width;
    if (width + w > maxWidth && current.length && token.text.trim()) {
      lines.push(current);
      current = [token];
      width = w;
    } else {
      current.push(token);
      width += w;
    }
  }
  if (current.length) {
    lines.push(current);
  }
  return lines;
}

function blockLines(ctx, block, maxWidth) {
  ctx.font = block.font;
  if (block.parts) {
    return layoutRich(ctx, block.parts, maxWidth);
  }
  return wrapLines(ctx, block.text, maxWidth).map((text) => [
    { text, color: block.color },
  ]);
}

function cardBlocks(results) {
  const tips = results?.tips || [];
  const amount = results?.suitable
    ? [
        {
          font: "bold 32px Helvetica, Arial, sans-serif",
          parts: [
            { text: `${copy.recommendedAmountIs} `, color: "#3b3b3b" },
            { text: gramsPhrase(results), color: ACCENT_RED },
          ],
        },
        {
          text: `${packLine(results.grams)} · ${copy.packSize}`,
          font: "26px Helvetica, Arial, sans-serif",
          color: "#717171",
        },
      ]
    : [
        {
          text: copy.notAFit,
          font: "bold 32px Helvetica, Arial, sans-serif",
          color: "#3b3b3b",
        },
      ];

  return [
    { text: copy.brand, font: "bold 28px Helvetica, Arial, sans-serif", color: "#ffffff", header: true },
    ...amount,
    {
      text: results?.suitable ? copy.howTo : copy.nextSteps,
      font: "bold 28px Helvetica, Arial, sans-serif",
      color: "#3b3b3b",
    },
    ...tips.map((tip, index) => ({
      text: `${index + 1}. ${tip}`,
      font: "26px Helvetica, Arial, sans-serif",
      color: "#3b3b3b",
    })),
    {
      text: results?.suitable ? copy.encouragement : copy.supportEncouragement,
      font: "italic 24px Helvetica, Arial, sans-serif",
      color: ACCENT_RED,
    },
  ];
}

async function renderStepsCanvas(results, imageDataUrl) {
  const width = 1080;
  const pad = 72;
  const maxWidth = width - pad * 2;
  const photoMaxW = 480;
  const photoMaxH = 360;
  const headerH = 120;
  const photo = await loadImage(imageDataUrl);

  let photoW = 0;
  let photoH = 0;
  if (photo) {
    const scale = Math.min(photoMaxW / photo.width, photoMaxH / photo.height, 1);
    photoW = Math.round(photo.width * scale);
    photoH = Math.round(photo.height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  const ctx = canvas.getContext("2d");
  const blocks = cardBlocks(results);

  let height = headerH + pad;
  if (photo) {
    height += photoH + 36;
  }
  for (const block of blocks) {
    if (block.header) {
      continue;
    }
    height += blockLines(ctx, block, maxWidth).length * 40 + 18;
  }
  canvas.height = height + pad;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(0, 0, width, headerH);

  let y = 72;
  for (const block of blocks) {
    if (block.header) {
      ctx.font = block.font;
      ctx.fillStyle = block.color;
      ctx.fillText(block.text, pad, y);
      y = headerH + pad;
      if (photo) {
        const x = Math.round((width - photoW) / 2);
        ctx.save();
        roundedRect(ctx, x, y, photoW, photoH, 18);
        ctx.clip();
        ctx.drawImage(photo, x, y, photoW, photoH);
        ctx.restore();
        y += photoH + 40;
      }
      continue;
    }
    ctx.font = block.font;
    const lines = blockLines(ctx, block, maxWidth);
    for (const line of lines) {
      let x = pad;
      for (const token of line) {
        ctx.fillStyle = token.color;
        ctx.fillText(token.text, x, y);
        x += ctx.measureText(token.text).width;
      }
      y += 40;
    }
    y += 16;
  }

  return canvas;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create the file."));
        return;
      }
      resolve(blob);
    }, type, quality);
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

export async function downloadStepsImage(results, imageDataUrl) {
  const canvas = await renderStepsCanvas(results, imageDataUrl);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  saveBlob(blob, "fixfinder-fix-finder-steps.jpg");
}

export async function printStepsPdf(results, imageDataUrl) {
  const canvas = await renderStepsCanvas(results, imageDataUrl);
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  const pdf = jpegToPdf(bytes, canvas.width, canvas.height);
  saveBlob(new Blob([pdf], { type: "application/pdf" }), "fixfinder-fix-finder-steps.pdf");
}

function jpegToPdf(jpegBytes, imgWidth, imgHeight) {
  const pageW = 595.28;
  const pageH = Number((pageW * (imgHeight / imgWidth)).toFixed(2));
  const encoder = new TextEncoder();
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`,
    (() => {
      const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im1 Do Q\n`;
      return `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`;
    })(),
  ];

  const imageHeader = encoder.encode(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  const imageFooter = encoder.encode("\nendstream\nendobj\n");

  const parts = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let offset = parts[0].length;

  for (const object of objects) {
    offsets.push(offset);
    const bytes = encoder.encode(object);
    parts.push(bytes);
    offset += bytes.length;
  }

  offsets.push(offset);
  parts.push(imageHeader, jpegBytes, imageFooter);
  offset += imageHeader.length + jpegBytes.length + imageFooter.length;

  const xrefStart = offset;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  parts.push(encoder.encode(xref), encoder.encode(trailer));

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}
