"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonSecondary } from "../button-styles";
import { clearLegacyTestPosts, readCommunityPosts } from "../community-store";
import { copy } from "../copy";
import { HoverPress } from "../hover-press";
import { SiteHeader } from "../site-header";
import { STORIES } from "../stories";
import { StoryCard } from "../story-card";

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [justPosted, setJustPosted] = useState(false);

  useEffect(() => {
    clearLegacyTestPosts();
    let cancelled = false;
    async function load() {
      let remote = [];
      try {
        const response = await fetch("/api/posts");
        const payload = await response.json().catch(() => ({}));
        if (Array.isArray(payload.posts)) {
          remote = payload.posts;
        }
      } catch {
        // Fall back to this-device posts if the shared feed is unavailable.
      }
      if (cancelled) {
        return;
      }
      const local = readCommunityPosts().filter(
        (post) => !remote.some((entry) => entry.id === post.id),
      );
      setPosts([...remote, ...local]);
    }
    load();
    try {
      if (sessionStorage.getItem("fixfinder-community-posted")) {
        sessionStorage.removeItem("fixfinder-community-posted");
        // Browser-only storage; cannot be read during the server render pass.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setJustPosted(true);
      }
    } catch {
      // Banner is optional if sessionStorage is blocked.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const all = [...posts, ...STORIES];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:max-w-3xl md:py-10">
        <p className="text-sm font-semibold text-brand">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70 hover:underline"
          >
            <BackArrow />
            {copy.backHome}
          </Link>
        </p>
        <div className="animate-fade-up relative mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-soft via-white to-mist px-5 py-7 sm:px-8">
          <div className="ambient-glow" />
          <div className="relative">
            <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">{copy.communityTitle}</h1>
            <p className="mt-2 text-sm text-muted">{copy.communityLead}</p>
          </div>
        </div>
        {justPosted ? (
          <p
            role="status"
            className="animate-fade-up mt-5 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand"
          >
            {copy.postedBanner}
          </p>
        ) : null}
        <HoverPress
          as="a"
          href="/community/write"
          className={`${buttonSecondary} mt-5 block w-full`}
        >
          {copy.writePost}
        </HoverPress>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {all.map((story, index) => (
            <li
              key={story.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 0.06}s` }}
            >
              <StoryCard story={story} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
