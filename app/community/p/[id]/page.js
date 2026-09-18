import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonPrimary } from "../../../button-styles";
import { copy } from "../../../copy";
import { SiteHeader } from "../../../site-header";
import { StoryCard } from "../../../story-card";
import { getPost } from "@/lib/posts";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const post = await getPost(id);
    if (!post) {
      return { title: copy.communityTitle };
    }
    return {
      title: `${post.title} | ${copy.brand}`,
      description: post.note || copy.communityLead,
      openGraph: {
        title: post.title,
        description: post.note || copy.shareYourFixLead,
        images: post.after ? [{ url: post.after }] : [],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.note || copy.communityLead,
        images: post.after ? [post.after] : [],
      },
    };
  } catch {
    return { title: copy.communityTitle };
  }
}

export default async function SharedPostPage({ params }) {
  const { id } = await params;
  let post = null;
  try {
    post = await getPost(id);
  } catch {
    post = null;
  }
  if (!post) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
          {copy.shareHashtag}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{copy.communityTitle}</h1>
        <p className="mt-2 text-sm text-muted">{copy.shareYourFixLead}</p>
        <div className="mt-6">
          <StoryCard story={post} />
        </div>
        <Link href="/#upload" className={`${buttonPrimary} mt-6 w-full`}>
          {copy.openFixFinder}
        </Link>
      </main>
    </div>
  );
}
