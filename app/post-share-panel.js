"use client";

import { useState } from "react";
import { buttonGhostIcon, buttonSecondary, buttonSecondarySm } from "./button-styles";
import { copy } from "./copy";
import { HoverPress } from "./hover-press";
import { exportPostShare, POST_SHARE_OPTIONS } from "./share-post";

const SOCIAL = POST_SHARE_OPTIONS.filter((option) => option.id !== "download");
const DOWNLOAD = POST_SHARE_OPTIONS.find((option) => option.id === "download");

const HINTS = {
  download: copy.shareHintDownload,
  "fb-story": copy.shareHintStory,
  "fb-post": copy.shareHintPost,
  "ig-story": copy.shareHintStory,
  "ig-post": copy.shareHintPost,
};

const ARIA = {
  download: copy.downloadPostImage,
  "fb-story": copy.shareFbStory,
  "fb-post": copy.shareFbPost,
  "ig-story": copy.shareIgStory,
  "ig-post": copy.shareIgPost,
};

export function PostSharePanel({ post, embedded = false }) {
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  async function onShare(optionId) {
    if (busy) {
      return;
    }
    setBusy(optionId);
    setNote(copy.sharePreparing);
    try {
      const result = await exportPostShare(post, optionId);
      if (result === "cancelled") {
        setNote("");
      } else if (result === "shared") {
        setNote(copy.shareShared);
      } else if (result === "opened") {
        setNote(copy.shareOpened);
      } else if (result === "blocked") {
        setNote(copy.sharePopupBlocked);
      } else {
        setNote(HINTS[optionId] || copy.saved);
      }
    } catch {
      setNote(copy.tryAgain);
    } finally {
      setBusy("");
    }
  }

  return (
    <section
      className={
        embedded
          ? "w-full shrink-0 sm:w-[15.75rem]"
          : "mt-6 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6"
      }
    >
      {embedded ? null : (
        <>
          <h2 className="text-lg font-bold text-ink">{copy.shareYourFix}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{copy.shareYourFixLead}</p>
        </>
      )}

      <div className={`${embedded ? "mt-0" : "mt-4"} grid grid-cols-2 gap-2.5`}>
        {SOCIAL.map((option) => (
          <HoverPress
            key={option.id}
            type="button"
            disabled={Boolean(busy)}
            aria-label={ARIA[option.id]}
            onClick={() => onShare(option.id)}
            className={`${embedded ? buttonSecondarySm : buttonSecondary} w-full`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {option.id.startsWith("fb") ? <FacebookIcon /> : <InstagramIcon />}
              {option.id.endsWith("story") ? copy.shareStory : copy.sharePost}
            </span>
          </HoverPress>
        ))}
      </div>

      <div className="mt-3 flex justify-center">
        <HoverPress
          type="button"
          disabled={Boolean(busy)}
          aria-label={ARIA.download}
          title={ARIA.download}
          onClick={() => onShare(DOWNLOAD.id)}
          className={buttonGhostIcon}
        >
          <DownloadIcon />
        </HoverPress>
      </div>

      {note ? (
        <p role="status" className="animate-fade-up mt-4 text-center text-sm font-medium text-brand">
          {busy ? copy.sharePreparing : note}
        </p>
      ) : null}
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12 4v11M7 11l5 5 5-5M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h3.2l.8-4H13V9c0-.6.4-1 1-1Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}
