/**
 * The QR code points back at this deployment, so the origin has to be resolved
 * at request time rather than baked in: preview deployments and self-hosted
 * copies each need their own target.
 */
function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function GET() {
  const target = encodeURIComponent(`${siteOrigin()}/#upload`);
  const source = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=2&color=3b3b3b&bgcolor=ffffff&data=${target}`;
  try {
    const response = await fetch(source, { next: { revalidate: 86400 } });
    if (!response.ok) {
      throw new Error("qr upstream failed");
    }
    const bytes = await response.arrayBuffer();
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("QR unavailable", { status: 502 });
  }
}
