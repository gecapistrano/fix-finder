import Link from "next/link";

import { copy } from "../../copy";

function cardImageUrl(id) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !id) {
    return "";
  }
  return `${base}/storage/v1/object/public/community-posts/share-cards/${id}.jpg`;
}

function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const storage = cardImageUrl(id);
  const generated = `${siteOrigin()}/s/${id}/opengraph-image`;
  return {
    metadataBase: new URL(siteOrigin()),
    title: `${copy.brand} · ${copy.shareHashtag}`,
    description: copy.shareYourFixLead,
    openGraph: {
      title: copy.brand,
      description: copy.shareYourFixLead,
      siteName: copy.brand,
      type: "article",
      images: [
        {
          url: storage || generated,
          secureUrl: storage || generated,
          width: 1080,
          height: 1350,
          type: "image/jpeg",
          alt: copy.shareHashtag,
        },
        { url: generated, width: 1080, height: 1350, type: "image/png" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.brand,
      description: copy.shareYourFixLead,
      images: [storage || generated],
    },
  };
}

export default async function ShareCardPage({ params }) {
  const { id } = await params;
  const image = cardImageUrl(id);

  return (
    <main className="min-h-full bg-[#141414] text-white">
      <header className="bg-brand px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
          {copy.shareHashtag}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{copy.brand}</h1>
      </header>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-8">
        {image ? (
          <img
            src={image}
            alt={copy.shareHashtag}
            className="w-full rounded-[28px] object-cover shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full flex-col justify-between rounded-[28px] bg-gradient-to-br from-brand to-brand-deep p-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/80">
              {copy.shareHashtag}
            </p>
            <div>
              <p className="text-4xl font-extrabold">A fix worth sharing</p>
              <p className="mt-3 text-white/90">Repair it. Keep it. Don&apos;t toss it.</p>
            </div>
          </div>
        )}
        <p className="mt-6 max-w-sm text-center text-sm leading-relaxed text-white/80">
          {copy.shareYourFixLead}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-5 py-4 text-ink">
          <img src="/api/qr" alt={copy.scanToFix} className="h-28 w-28" />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            {copy.scanToFix}
          </p>
        </div>
        <Link
          href="/#upload"
          className="mt-6 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-brand"
        >
          {copy.openFixFinder}
        </Link>
      </div>
    </main>
  );
}
