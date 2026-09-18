import { ImageResponse } from "next/og";
import { copy } from "../../copy";

export const size = { width: 1080, height: 1350 };
export const contentType = "image/png";

function cardImageUrl(id) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !id) {
    return "";
  }
  return `${base}/storage/v1/object/public/community-posts/share-cards/${id}.jpg`;
}

export default async function Image({ params }) {
  const { id } = await params;
  const url = cardImageUrl(id);
  let ready = false;
  if (url) {
    try {
      const probe = await fetch(url, { cache: "no-store" });
      ready = probe.ok;
    } catch {
      ready = false;
    }
  }

  if (ready) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#fff7f7",
          }}
        >
          <img
            src={url}
            alt=""
            width={1080}
            height={1350}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ),
      size,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fff7f7",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "#dc2626",
            color: "white",
            padding: "48px 56px",
            height: 180,
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 800 }}>{copy.brand}</div>
          <div style={{ fontSize: 26, marginTop: 8 }}>{copy.shareHashtag}</div>
        </div>
        <div style={{ display: "flex", gap: 20, padding: "40px 52px" }}>
          <div
            style={{
              display: "flex",
              flex: 1,
              height: 620,
              borderRadius: 28,
              background: "#f4e8e8",
              color: "#dc2626",
              alignItems: "flex-start",
              padding: 24,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {copy.before}
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              height: 620,
              borderRadius: 28,
              background: "#dc2626",
              color: "white",
              alignItems: "flex-start",
              padding: 24,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {copy.after}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "0 56px",
            color: "#3b3b3b",
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 800 }}>A fix worth sharing</div>
          <div style={{ fontSize: 28, marginTop: 16, color: "#717171" }}>
            Repair it. Keep it. Don&apos;t toss it.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              background: "#dc2626",
              color: "white",
              borderRadius: 999,
              padding: "14px 28px",
              fontSize: 26,
              fontWeight: 700,
              width: 320,
            }}
          >
            {copy.shareHashtag}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
