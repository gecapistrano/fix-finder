"use client";

import { useCallback, useRef, useState } from "react";
import { copy } from "./copy";

/**
 * Draggable before/after comparison slider.
 * Defaults to a 45% reveal of "before" so the "after" (the payoff) reads first,
 * then invites the visitor to drag left to see the damage.
 */
export function BeforeAfterSlider({ before, after, title = "" }) {
  const [position, setPosition] = useState(45);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  const updateFromClientX = useCallback((clientX) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) {
      return;
    }
    const ratio = ((clientX - box.left) / box.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  function onPointerDown(event) {
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateFromClientX(event.clientX);
  }

  function onPointerMove(event) {
    if (!dragging) {
      return;
    }
    updateFromClientX(event.clientX);
  }

  function onPointerUp() {
    setDragging(false);
  }

  function onKeyDown(event) {
    const step = event.shiftKey ? 10 : 4;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((value) => Math.max(0, value - step));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((value) => Math.min(100, value + step));
    }
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[4/3] min-h-[180px] w-full touch-none select-none overflow-hidden rounded-t-2xl bg-mist"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* After photo is the base layer, fills the whole frame. */}
      <img
        src={after}
        alt={title ? `${title} — after` : ""}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ height: "100%", width: "100%" }}
      />
      <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {copy.after}
      </span>

      {/* Before photo sits on top, clipped to the slider position via clip-path
          so it never re-scales relative to a shrinking container. */}
      <div
        className="absolute inset-0 h-full w-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={before}
          alt={title ? `${title} — before` : ""}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ height: "100%", width: "100%" }}
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {copy.before}
        </span>
      </div>

      {/* Drag handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={copy.beforeAfterSlider}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={onKeyDown}
        className="absolute top-0 z-10 flex h-full w-8 -translate-x-1/2 cursor-ew-resize items-center justify-center outline-none"
        style={{ left: `${position}%` }}
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-transform duration-150 ${
            dragging ? "scale-110" : "group-hover:scale-105"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M9 6l-5 6 5 6M15 6l5 6-5 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
