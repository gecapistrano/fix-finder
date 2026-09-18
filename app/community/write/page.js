"use client";

import { useEffect, useState } from "react";
import { buttonPrimary, buttonSecondary } from "../../button-styles";
import { saveCommunityPost } from "../../community-store";
import { copy } from "../../copy";
import { fileToDataUrl } from "../../file-to-data-url";
import { HoverPress } from "../../hover-press";
import { PostSharePanel } from "../../post-share-panel";
import { readScanDraft } from "../../scan-draft";
import { SiteHeader } from "../../site-header";
import { StoryCard } from "../../story-card";

const fieldClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink outline-none placeholder:text-muted transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";
const lockedClass =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-base text-ink outline-none";

export default function WritePostPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [product, setProduct] = useState("");
  const [note, setNote] = useState("");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fromScan, setFromScan] = useState(false);
  const [published, setPublished] = useState(null);
  const [editing, setEditing] = useState({
    title: false,
    product: false,
    before: false,
  });

  useEffect(() => {
    const draft = readScanDraft();
    if (!draft || (!draft.title && !draft.before && !draft.product)) {
      return;
    }
    // The draft lives in browser storage, so it can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(draft.title);
    setProduct(draft.product);
    setBefore(draft.before);
    setFromScan(true);
  }, []);

  function unlock(field) {
    setEditing((current) => ({ ...current, [field]: true }));
  }

  async function onPick(event, setter) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(copy.usePhoto);
      return;
    }
    try {
      setter(await fileToDataUrl(file));
      setError("");
    } catch {
      setError(copy.tryAgain);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!title.trim() || !note.trim() || !before || !after) {
      setError("Please add a title, both photos, and your story.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          product: product.trim(),
          note: note.trim(),
          before,
          after,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || copy.tryAgain);
      }
      if (!payload.allowed) {
        setError(payload.user_reason || copy.postRejected);
        setSaving(false);
        return;
      }

      const nextPost = {
        ...(payload.post || {}),
        id: payload.post?.id || `post-${Date.now()}`,
        title: title.trim(),
        author: author.trim(),
        product: product.trim(),
        note: note.trim(),
        before,
        after,
      };
      if (!payload.saved) {
        saveCommunityPost(nextPost);
      }
      try {
        sessionStorage.setItem("fixfinder-community-posted", "1");
      } catch {
        // Banner is optional if sessionStorage is blocked.
      }
      setPublished(nextPost);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSaving(false);
      setError(err.message === "storage-full" ? copy.storageFull : err.message || copy.tryAgain);
    }
  }

  const titleLocked = fromScan && !editing.title;
  const productLocked = fromScan && !editing.product;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:max-w-3xl md:py-10">
        <p className="text-sm font-semibold text-brand">
          <a
            href="/community"
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70 hover:underline"
          >
            <BackArrow />
            {copy.backCommunity}
          </a>
        </p>
        {published ? (
          <PostedSuccess post={published} />
        ) : (
          <>
        <h1 className="animate-fade-up mt-3 text-2xl font-bold text-ink md:text-3xl">{copy.writePost}</h1>
        <p className="mt-1 text-sm text-muted">{copy.shareInvite}</p>
        <p className="mt-2 text-xs text-muted">{copy.postGuidelines}</p>
        {fromScan ? (
          <p className="animate-fade-up mt-4 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
            {copy.fromScanHint}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
          <Field
            label={copy.postTitle}
            locked={titleLocked}
            onEdit={() => unlock("title")}
          >
            <input
              value={title}
              readOnly={titleLocked}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={copy.postTitle}
              className={titleLocked ? lockedClass : fieldClass}
            />
          </Field>

          <div>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder={copy.postAuthor}
              maxLength={40}
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-muted">{copy.postAuthorHint}</p>
          </div>

          <Field
            label={copy.postProduct}
            locked={productLocked}
            onEdit={() => unlock("product")}
          >
            <input
              value={product}
              readOnly={productLocked}
              onChange={(event) => setProduct(event.target.value)}
              placeholder={copy.postProduct}
              className={productLocked ? lockedClass : fieldClass}
            />
          </Field>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={copy.postNote}
            rows={4}
            className={fieldClass}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoField
              label={copy.postBefore}
              value={before}
              onPick={(event) => {
                unlock("before");
                onPick(event, setBefore);
              }}
              onRemove={() => {
                unlock("before");
                setBefore("");
              }}
            />
            <PhotoField
              label={copy.postAfter}
              value={after}
              onPick={(event) => onPick(event, setAfter)}
              onRemove={() => setAfter("")}
            />
          </div>

          {error ? (
            <p role="alert" className="animate-fade-up rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">
              {error}
            </p>
          ) : null}

          <HoverPress
            type="submit"
            disabled={saving}
            className={`${buttonPrimary} w-full`}
          >
            {saving ? copy.reviewingPost : copy.publishPost}
          </HoverPress>
        </form>
          </>
        )}
      </main>
    </div>
  );
}

function PostedSuccess({ post }) {
  return (
    <div className="mx-auto w-full">
      <div className="animate-fade-up relative mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-soft via-white to-mist px-5 py-7 sm:px-8">
        <div className="ambient-glow" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
              {copy.postedThanksKicker}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-ink md:text-3xl">
              {copy.postedThanksTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{copy.shareYourFixLead}</p>
          </div>
          <PostSharePanel post={post} embedded />
        </div>
      </div>
      <div className="animate-fade-up mx-auto mt-5 max-w-md">
        <StoryCard story={post} />
      </div>
      <HoverPress as="a" href="/community" className={`${buttonSecondary} mx-auto mt-5 block w-full max-w-md`}>
        {copy.seeInCommunity}
      </HoverPress>
    </div>
  );
}

function Field({ label, locked, onEdit, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-ink">{label}</label>
        {locked ? <EditButton onClick={onEdit} /> : null}
      </div>
      {children}
    </div>
  );
}

function PhotoField({ label, value, onPick, onRemove }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      {value ? (
        <div>
          <img
            src={value}
            alt=""
            className="animate-scale-in h-28 w-full rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 text-xs font-semibold text-brand underline underline-offset-2"
          >
            {copy.remove}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-line bg-paper px-3 py-4 text-center transition-colors hover:border-brand/50">
          <input
            type="file"
            accept="image/*"
            onChange={onPick}
            className="block w-full text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>
      )}
    </div>
  );
}

function EditButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.editField}
      title={copy.editField}
      className="flex h-8 w-8 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand-soft"
    >
      <PencilIcon />
    </button>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13 6.5 17.5 11" stroke="currentColor" strokeWidth="1.8" />
    </svg>
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
