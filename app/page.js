"use client";

import { useEffect, useRef, useState } from "react";
import { BuyMenu } from "./buy-menu";
import { buttonGhostIcon, buttonPrimary, buttonSecondary, buttonTertiary, cx } from "./button-styles";
import { copy } from "./copy";
import { HoverPress } from "./hover-press";
import { VENDOR } from "./links";
import { formatGrams, packsNeeded, productImage, SUPER_GLUE_NAME } from "./products";
import { clearScanDraft, saveScanDraft } from "./scan-draft";
import { copyStepsToClipboard, downloadStepsImage, printStepsPdf } from "./share";
import { SiteHeader } from "./site-header";
import { STORIES } from "./stories";
import { StoryCard } from "./story-card";

function mapAskResult(payload) {
  const result = payload.result ?? {};
  const scanId = result.scan_id || payload.scan_id || "";

  // Only the model may request clarification — never invent this client-side.
  if (result.status === "needs_clarification") {
    return {
      status: "needs_clarification",
      scanId,
      object: result.object || "",
      material: result.material || "",
      damage: result.damage || "",
      clarifyingQuestion: result.clarifying_question || "",
      suggestedAnswers: Array.isArray(result.suggested_answers)
        ? result.suggested_answers.map(String).filter(Boolean).slice(0, 4)
        : [],
      allowCustomAnswer: result.allow_custom_answer !== false,
    };
  }

  return {
    status: "resolved",
    scanId,
    object: result.object,
    material: result.material,
    damage: result.damage,
    tips: Array.isArray(result.tips) ? result.tips : [],
    suitable: Boolean(result.suitable),
    grams: result.grams ?? null,
    product: {
      name: result.recommended_product,
      reason: result.suitable
        ? result.why
        : result.user_message || result.why,
    },
    demo: Boolean(payload.demo),
  };
}

async function analyzeDamage({
  imageBase64,
  context,
  scanId,
  clarifyingQuestion,
  clarifyingAnswer,
}) {
  const body = {
    image: imageBase64,
    message: context,
  };
  if (scanId) {
    body.scan_id = scanId;
  }
  if (clarifyingAnswer) {
    body.clarifying_question = clarifyingQuestion || "";
    body.clarifying_answer = clarifyingAnswer;
  }

  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(copy.tryAgain);
  }

  if (!response.ok) {
    throw new Error(payload.error || copy.tryAgain);
  }

  return mapAskResult(payload);
}

function fileToBase64(file) {
  const MAX_EDGE = 512;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const commaIndex = dataUrl.indexOf(",");
        resolve(commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl);
      };
      img.onerror = () => reject(new Error("That photo could not be read. Please try another."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("That photo could not be read. Please try another."));
    reader.readAsDataURL(file);
  });
}

const MAX_CONTEXT = 500;

function isMobileCamera() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

async function getRearCameraStream() {
  const rearAttempts = [
    { audio: false, video: { facingMode: { exact: "environment" } } },
    { audio: false, video: { facingMode: "environment" } },
  ];

  for (const constraints of rearAttempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      // Try the next rear-camera constraint.
    }
  }

  const fallback = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true,
  });

  const devices = await navigator.mediaDevices.enumerateDevices();
  const rear = devices.find(
    (device) =>
      device.kind === "videoinput" &&
      /back|rear|environment|posterior|hind/i.test(device.label),
  );

  if (!rear?.deviceId) {
    return fallback;
  }

  fallback.getTracks().forEach((track) => track.stop());
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { deviceId: { exact: rear.deviceId } },
  });
}

function newestCommunityStories(remote, count = 3) {
  const picked = [];
  const seen = new Set();
  for (const story of [...remote, ...STORIES]) {
    if (!story?.id || seen.has(story.id)) {
      continue;
    }
    seen.add(story.id);
    picked.push(story);
    if (picked.length === count) {
      break;
    }
  }
  return picked;
}

export default function Home() {
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [context, setContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [clarification, setClarification] = useState(null);
  const [customAnswer, setCustomAnswer] = useState("");
  const [scanId, setScanId] = useState("");
  const lastImageRef = useRef("");
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [featuredStories, setFeaturedStories] = useState(STORIES.slice(0, 3));

  useEffect(() => {
    let cancelled = false;
    async function loadFeatured() {
      try {
        const response = await fetch("/api/posts");
        const payload = await response.json().catch(() => ({}));
        const remote = Array.isArray(payload.posts) ? payload.posts : [];
        if (!cancelled) {
          setFeaturedStories(newestCommunityStories(remote));
        }
      } catch {
        // Keep the mock stories if the shared feed is unavailable.
      }
    }
    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  // An object URL is an external resource that must be revoked on cleanup, so
  // the preview cannot simply be derived during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOpen || !video || !streamRef.current) {
      return undefined;
    }
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    function onPaste(event) {
      const item = [...(event.clipboardData?.items || [])].find((entry) =>
        entry.type.startsWith("image/"),
      );
      if (item) {
        const file = item.getAsFile();
        if (file) applyFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    try {
      const note = sessionStorage.getItem("fixfinder-fix-note");
      if (note) {
        // sessionStorage is browser-only, so this cannot be read during render
        // without breaking the server pass.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setContext(note);
        sessionStorage.removeItem("fixfinder-fix-note");
      }
    } catch {
      // sessionStorage can be blocked in private mode.
    }
  }, []);

  useEffect(() => {
    if (!shareNote) {
      return undefined;
    }
    const timer = window.setTimeout(() => setShareNote(""), 2200);
    return () => window.clearTimeout(timer);
  }, [shareNote]);

  useEffect(() => {
    if (!results) {
      return;
    }
    saveScanDraft({
      title: results.object || "",
      product: SUPER_GLUE_NAME,
      before: lastImageRef.current
        ? `data:image/jpeg;base64,${lastImageRef.current}`
        : "",
    });
  }, [results]);

  useEffect(() => {
    const id = results
      ? "result"
      : clarification
        ? "clarification"
        : window.location.hash.replace("#", "");
    if (!id) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [results, clarification]);

  function applyFile(file) {
    setError("");
    setResults(null);
    setClarification(null);
    setCustomAnswer("");
    setScanId("");
    lastImageRef.current = "";
    clearScanDraft();

    if (!file || !file.type.startsWith("image/")) {
      setImageFile(null);
      setError(copy.usePhoto);
      return;
    }

    setImageFile(file);
    resetInputs();
  }

  function handleImageChange(event) {
    applyFile(event.target.files?.[0]);
  }

  function resetInputs() {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function startOver() {
    setImageFile(null);
    setResults(null);
    setClarification(null);
    setCustomAnswer("");
    setScanId("");
    lastImageRef.current = "";
    clearScanDraft();
    setError("");
    setContext("");
    setShareNote("");
    resetInputs();
    stopCamera();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setError("");

    if (isMobileCamera()) {
      cameraInputRef.current?.click();
      return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      streamRef.current = await getRearCameraStream();
      setCameraOpen(true);
    } catch {
      setError(copy.cameraDenied);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(copy.tryAgain);
          return;
        }
        applyFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResults(null);
    setClarification(null);

    if (!imageFile) {
      setError(copy.addPhoto);
      return;
    }

    setIsAnalyzing(true);

    try {
      const imageBase64 = await fileToBase64(imageFile);
      lastImageRef.current = imageBase64;
      const data = await analyzeDamage({
        imageBase64,
        context: context.trim(),
      });
      setScanId(data.scanId || "");
      if (data.status === "needs_clarification") {
        setClarification(data);
        return;
      }
      setResults(data);
    } catch (err) {
      setError(err.message || copy.tryAgain);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function submitClarification(answer) {
    const text = String(answer || "").trim();
    if (!text) {
      setError(copy.addClarifyingAnswer);
      return;
    }
    if (!lastImageRef.current) {
      setError(copy.tryAgain);
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const data = await analyzeDamage({
        imageBase64: lastImageRef.current,
        context: context.trim(),
        scanId,
        clarifyingQuestion: clarification?.clarifyingQuestion || "",
        clarifyingAnswer: text,
      });
      setCustomAnswer("");
      if (data.status === "needs_clarification") {
        setError(copy.tryAgain);
        return;
      }
      setClarification(null);
      setScanId(data.scanId || scanId);
      setResults(data);
    } catch (err) {
      setError(err.message || copy.tryAgain);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleCustomClarify(event) {
    event.preventDefault();
    submitClarification(customAnswer);
  }

  function scanPhotoDataUrl() {
    return lastImageRef.current
      ? `data:image/jpeg;base64,${lastImageRef.current}`
      : "";
  }

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:max-w-3xl md:py-10">
        {results ? (
          <article
            id="result"
            key={results.object || "result"}
            className="animate-fade-up scroll-mt-24"
          >
            <div
              id="fix-print"
              className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_45px_-25px_rgba(59,59,59,0.35)]"
            >
              <div className="relative overflow-hidden bg-gradient-to-b from-mist to-white px-4 py-8">
                <div className="ambient-glow" />
                <div className="relative">
                  {results.demo ? (
                    <p className="mb-3 text-center text-xs font-medium text-muted">
                      {copy.sample}
                    </p>
                  ) : null}
                  {results.suitable ? (
                    <img
                      src={productImage()}
                      alt={copy.recommendedProduct}
                      className="animate-pop-in mx-auto h-52 w-auto object-contain drop-shadow-xl"
                    />
                  ) : (
                    <img
                      src="/icons/support.svg"
                      alt={copy.contactSupport}
                      className="animate-pop-in mx-auto h-28 w-28"
                    />
                  )}
                  <p
                    className={`animate-fade-up delay-1 mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] ${
                      results.suitable ? "text-brand" : "text-muted"
                    }`}
                  >
                    {results.suitable ? copy.recommended : copy.needHelp}
                  </p>
                  <h1
                    className={`animate-fade-up delay-2 mt-1 text-center text-2xl font-bold md:text-3xl ${
                      results.suitable ? "text-brand" : "text-ink"
                    }`}
                  >
                    {results.suitable
                      ? `${formatGrams(results.grams)} g`
                      : copy.notAFit}
                  </h1>
                  {results.suitable ? (
                    <>
                      <p className="animate-fade-up delay-3 mt-4 text-center">
                        <span className="inline-block rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(225,0,15,0.6)]">
                          {packsNeeded(results.grams) === 1
                            ? copy.packNeedOne
                            : copy.packNeedMany.replace(
                                "{n}",
                                String(packsNeeded(results.grams)),
                              )}
                        </span>
                      </p>
                      <p className="mt-2 text-center text-xs text-muted">
                        {copy.packSize}
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted">
                        {copy.recommendedProduct}
                        {results.product?.reason ? ` — ${results.product.reason}` : ""}
                      </p>
                      <p className="mt-1 text-center text-xs text-muted">
                        {copy.packClaims}
                      </p>
                    </>
                  ) : (
                    <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted">
                      {results.product?.reason || copy.supportLead}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-stretch border-y border-line bg-white">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={copy.uploadedPhoto}
                    className="h-24 w-24 shrink-0 object-cover sm:h-28 sm:w-28"
                  />
                ) : (
                  <div className="h-24 w-24 shrink-0 bg-mist sm:h-28 sm:w-28" />
                )}
                <dl className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-line">
                  <Fact label={copy.object} value={results.object} />
                  <Fact label={copy.material} value={results.material} />
                  <Fact label={copy.damage} value={results.damage} />
                </dl>
              </div>

              {results.tips?.length ? (
                <div className="px-4 py-6">
                  <h2 className="text-sm font-bold text-ink">
                    {results.suitable ? copy.howTo : copy.nextSteps}
                  </h2>
                  <ol className="mt-4 space-y-3">
                    {results.tips.map((tip, index) => (
                      <li
                        key={tip}
                        className="animate-fade-up flex items-start gap-3 rounded-xl bg-paper/70 p-3 text-sm leading-5 text-ink"
                        style={{ animationDelay: `${0.06 * index}s` }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                          {index + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium leading-relaxed text-brand">
                    {results.suitable
                      ? copy.encouragement
                      : copy.supportEncouragement}
                  </p>
                </div>
              ) : null}

              <p className="border-t border-line bg-paper/60 px-4 py-3 text-[11px] leading-relaxed text-muted">
                {copy.aiNote}{" "}
                <a
                  href={VENDOR.contact}
                  className="font-semibold text-brand underline underline-offset-2"
                >
                  {copy.aiNoteAsk}
                </a>
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2 print:hidden">
              <HoverPress
                type="button"
                aria-label={copy.copySteps}
                title={copy.copySteps}
                onClick={async () => {
                  try {
                    await copyStepsToClipboard(results, scanPhotoDataUrl());
                    setShareNote(copy.copied);
                  } catch {
                    setShareNote(copy.tryAgain);
                  }
                }}
                className={buttonGhostIcon}
              >
                {shareNote === copy.copied ? <CheckIcon /> : <CopyIcon />}
              </HoverPress>
              <HoverPress
                type="button"
                aria-label={copy.downloadSteps}
                title={copy.downloadSteps}
                onClick={async () => {
                  try {
                    await downloadStepsImage(results, scanPhotoDataUrl());
                    setShareNote(copy.saved);
                  } catch {
                    setShareNote(copy.tryAgain);
                  }
                }}
                className={buttonGhostIcon}
              >
                {shareNote === copy.saved ? <CheckIcon /> : <DownloadIcon />}
              </HoverPress>
              <HoverPress
                type="button"
                aria-label={copy.printSteps}
                title={copy.printSteps}
                onClick={async () => {
                  try {
                    await printStepsPdf(results, scanPhotoDataUrl());
                    setShareNote(copy.printed);
                  } catch {
                    setShareNote(copy.tryAgain);
                  }
                }}
                className={buttonGhostIcon}
              >
                <PrintIcon />
              </HoverPress>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <HoverPress
                type="button"
                onClick={() =>
                  document.getElementById("real-results")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className={cx(buttonSecondary, "order-2 flex-1 sm:order-1")}
              >
                {copy.seeResults}
              </HoverPress>
              {results.suitable ? (
                <BuyMenu className="order-1 flex-1 sm:order-2" />
              ) : (
                <HoverPress
                  as="a"
                  href={VENDOR.contact}
                  className={cx(buttonPrimary, "order-1 flex-1 sm:order-2")}
                >
                  {copy.contactSupport}
                </HoverPress>
              )}
            </div>
            <button
              type="button"
              onClick={startOver}
              className={cx(buttonTertiary, "mt-5 block w-full")}
            >
              {copy.tryAnother}
            </button>
          </article>
        ) : clarification ? (
          <section
            id="clarification"
            className="animate-fade-up scroll-mt-24 space-y-4"
          >
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_45px_-25px_rgba(59,59,59,0.35)]">
              <div className="relative overflow-hidden bg-gradient-to-b from-mist to-white px-5 py-7 sm:px-8">
                <div className="ambient-glow" />
                <div className="relative space-y-4">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={copy.uploadedPhoto}
                      className="mx-auto h-28 w-28 rounded-2xl object-cover shadow-sm md:h-36 md:w-36"
                    />
                  ) : null}
                  <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-brand">
                    {copy.clarifyingLead}
                  </p>
                  <h1 className="text-center text-2xl font-bold text-ink md:text-3xl">
                    {clarification.clarifyingQuestion}
                  </h1>
                  {context.trim() ? (
                    <p className="mx-auto max-w-md text-center text-sm text-muted">
                      {context.trim()}
                    </p>
                  ) : null}
                </div>
              </div>

              <form onSubmit={handleCustomClarify} className="space-y-4 px-5 py-6 sm:px-8">
                {clarification.suggestedAnswers.length ? (
                  <div className="grid gap-2.5">
                    {clarification.suggestedAnswers.map((answer) => (
                      <HoverPress
                        key={answer}
                        type="button"
                        disabled={isAnalyzing}
                        onClick={() => submitClarification(answer)}
                        className={cx(buttonSecondary, "w-full")}
                      >
                        {answer}
                      </HoverPress>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                    {clarification.suggestedAnswers.length ? (
                      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
                        {copy.orTypeAnswer}
                      </p>
                    ) : null}
                    <input
                      type="text"
                      maxLength={MAX_CONTEXT}
                      value={customAnswer}
                      disabled={isAnalyzing}
                      onChange={(event) => setCustomAnswer(event.target.value)}
                      placeholder={copy.customAnswerPlaceholder}
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink outline-none placeholder:text-muted transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
                    />
                    <HoverPress
                      type="submit"
                      disabled={isAnalyzing}
                      aria-busy={isAnalyzing}
                      className={cx(buttonPrimary, "w-full py-4")}
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="spin-slow h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                          <span className="shimmer-text font-semibold">
                            {copy.analyzingAnswer}
                          </span>
                        </>
                      ) : (
                        copy.sendAnswer
                      )}
                    </HoverPress>
                  </div>

                {error ? (
                  <p
                    role="alert"
                    className="animate-fade-up rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand"
                  >
                    {error}
                  </p>
                ) : null}

                <HoverPress
                  type="button"
                  disabled={isAnalyzing}
                  onClick={startOver}
                  className={cx(buttonTertiary, "w-full")}
                >
                  {copy.tryAnother}
                </HoverPress>
              </form>
            </div>
          </section>
        ) : (
          <form
            id="upload"
            className={`scroll-mt-24 space-y-5 rounded-3xl transition-all duration-300 ${
              isDragging
                ? "outline outline-2 outline-brand outline-offset-8 scale-[1.005]"
                : ""
            }`}
            onSubmit={handleSubmit}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-soft via-white to-mist px-5 py-7 sm:px-8 sm:py-9">
              <div className="ambient-glow" />
              <div className="relative flex items-center gap-4 sm:gap-6">
                <h1 className="animate-fade-up min-w-0 flex-1 whitespace-pre-line text-[1.75rem] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-4xl md:text-5xl">
                  {copy.headline}
                </h1>
                <div className="relative shrink-0">
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-1 h-4 rounded-full bg-black/15 blur-md sm:bottom-2"
                  />
                  <img
                    src={productImage()}
                    alt={SUPER_GLUE_NAME}
                    className="animate-float relative h-24 w-24 object-contain drop-shadow-2xl sm:h-32 sm:w-32 md:h-40 md:w-40"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
            {previewUrl ? (
            <div className="animate-scale-in overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-sm md:p-6">
                <div className="flex items-center gap-3 md:flex-col md:items-start">
                  <img
                    src={previewUrl}
                    alt="Selected photo"
                    className="h-20 w-20 rounded-xl object-cover md:h-48 md:w-full"
                  />
                  <HoverPress
                    type="button"
                    onClick={startOver}
                    className={buttonTertiary}
                  >
                    {copy.remove}
                  </HoverPress>
                </div>
            </div>
            ) : (
              <div
                onClick={() => galleryInputRef.current?.click()}
                role="presentation"
                className={cx(
                  "group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-4 py-12 text-center transition-all duration-200 md:col-span-2",
                  isDragging
                    ? "scale-[1.01] border-brand bg-brand-soft shadow-[0_0_0_6px_rgba(225,0,15,0.08)]"
                    : "border-line bg-white hover:border-brand/60 hover:bg-brand-soft/40 hover:shadow-sm",
                )}
              >
                <span
                  className={cx(
                    "flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft transition-transform duration-200",
                    isDragging
                      ? "animate-drop-pulse bg-brand/15"
                      : "group-hover:-translate-y-1 group-hover:scale-105",
                  )}
                >
                  <UploadIcon className="h-7 w-7 text-brand" />
                </span>
                <p className="text-sm font-semibold text-ink">{copy.dropHint}</p>
                <p className="text-xs text-muted">{copy.dropSubHint}</p>
              </div>
            )}

            <div className={`space-y-4 ${previewUrl ? "" : "md:col-span-2"}`}>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="sr-only"
            />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <HoverPress
                type="button"
                onClick={openCamera}
                className={buttonPrimary}
              >
                <CameraIcon className="block h-4 w-4 shrink-0" />
                {copy.camera}
              </HoverPress>
              <HoverPress
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={buttonSecondary}
              >
                <GalleryIcon className="block h-4 w-4 shrink-0" />
                {copy.gallery}
              </HoverPress>
            </div>

            {imageFile || context ? (
              <input
                id="context"
                type="text"
                maxLength={MAX_CONTEXT}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder={copy.notePlaceholder}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink outline-none placeholder:text-muted transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            ) : null}

            {error ? (
              <p
                role="alert"
                className="animate-fade-up rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand"
              >
                {error}
              </p>
            ) : null}

            {imageFile ? (
              <HoverPress
                type="submit"
                disabled={isAnalyzing}
                aria-busy={isAnalyzing}
                className={cx(buttonPrimary, "w-full py-4")}
              >
                {isAnalyzing ? (
                  <>
                    <span className="spin-slow h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    <span className="shimmer-text font-semibold">{copy.analyzing}</span>
                  </>
                ) : (
                  copy.submit
                )}
              </HoverPress>
            ) : null}
            </div>
            </div>
          </form>
        )}

        <section
          id="real-results"
          className="mt-20 scroll-mt-24 rounded-3xl bg-mist px-4 py-10 sm:px-8"
        >
          <p className="text-sm leading-relaxed text-ink">{copy.shareInvite}</p>
          <HoverPress
            as="a"
            href="/community/write"
            className={cx(buttonSecondary, "mt-4 block w-full")}
          >
            {copy.writePost}
          </HoverPress>
          <div className="mt-12 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">{copy.realResults}</h2>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
            <span>{copy.realResultsLead}</span>
            <span className="font-bold text-brand">{copy.brand}</span>
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {featuredStories.map((story, index) => (
              <li
                key={story.id}
                className="animate-fade-up"
                style={{ animationDelay: `${0.08 * index}s` }}
              >
                <StoryCard story={story} />
              </li>
            ))}
          </ul>
          <HoverPress
            as="a"
            href="/community"
            className={cx(buttonSecondary, "mt-7 block w-full")}
          >
            {copy.seeMore}
          </HoverPress>
        </section>

        <section id="learning-hub" className="mt-16 scroll-mt-24 px-1 pb-4">
          <h2 className="text-xl font-bold text-ink">{copy.learnMore}</h2>
          <HoverPress
            as="a"
            href="/learn"
            className={cx(buttonPrimary, "mt-4 block w-full")}
          >
            {copy.goToHub}
          </HoverPress>
        </section>
      </main>

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black animate-scale-in">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="min-h-0 flex-1 bg-black object-cover"
          />
          <div className="grid grid-cols-2 gap-2.5 p-4">
            <HoverPress
              type="button"
              onClick={stopCamera}
              className="rounded-xl border-2 border-white/70 px-4 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:border-white"
            >
              {copy.closeCamera}
            </HoverPress>
            <HoverPress
              type="button"
              onClick={capturePhoto}
              className={buttonPrimary}
            >
              {copy.capturePhoto}
            </HoverPress>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="px-2 py-2 sm:px-3 sm:py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-brand">
        {label}
      </dt>
      <dd className="mt-1 text-xs font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 9V6.8A1.8 1.8 0 0 0 13.2 5H6.8A1.8 1.8 0 0 0 5 6.8v6.4A1.8 1.8 0 0 0 6.8 15H9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M12 4v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M7 8V5h10v3" stroke="currentColor" strokeWidth="1.8" />
      <rect x="6" y="14" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M5 12.5l5 5 9-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 15V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="3.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function GalleryIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="4" y="4.5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0l1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17l3.5-3.5a1.5 1.5 0 0 1 2.1 0L19 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
