"use client";

import { useEffect, useRef } from "react";

export function HoverPress({
  as: Comp = "button",
  className = "",
  children,
  blob = false,
  ...props
}) {
  const rootRef = useRef(null);
  const overlayRef = useRef(null);
  const hoverRef = useRef(false);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function tick() {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }
    currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.22;
    currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.22;
    overlay.style.setProperty("--hx", `${currentRef.current.x}px`);
    overlay.style.setProperty("--hy", `${currentRef.current.y}px`);
    if (hoverRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  function onMouseEnter(event) {
    const box = rootRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    hoverRef.current = true;
    const point = { x: event.clientX - box.left, y: event.clientY - box.top };
    targetRef.current = point;
    currentRef.current = point;
    if (overlayRef.current) {
      overlayRef.current.style.opacity = "1";
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }

  function onMouseMove(event) {
    const box = rootRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    targetRef.current = {
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    };
  }

  function onMouseLeave() {
    hoverRef.current = false;
    if (overlayRef.current) {
      overlayRef.current.style.opacity = "0";
    }
    cancelAnimationFrame(rafRef.current);
  }

  const onRedFill =
    className.includes("bg-brand") || className.includes("text-white");

  return (
    <Comp
      ref={rootRef}
      className={`group relative isolate ${blob ? "overflow-visible" : "overflow-hidden"} ${className}`}
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <span
        ref={overlayRef}
        aria-hidden
        className={
          blob
            ? "pointer-events-none absolute opacity-0 transition-opacity duration-300"
            : "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        }
        style={
          blob
            ? {
                left: 0,
                top: 0,
                width: "4.5rem",
                height: "4.5rem",
                borderRadius: "9999px",
                transform:
                  "translate(var(--hx, 50%), var(--hy, 50%)) translate(-50%, -50%)",
                background: onRedFill
                  ? "rgba(255, 255, 255, 0.88)"
                  : "rgba(220, 38, 38, 0.88)",
              }
            : {
                background: onRedFill
                  ? "radial-gradient(160px circle at var(--hx, 50%) var(--hy, 50%), rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.95))"
                  : "radial-gradient(160px circle at var(--hx, 50%) var(--hy, 50%), rgba(220, 38, 38, 0.55), rgba(220, 38, 38, 0.95))",
              }
        }
      />
      <span
        className={`relative z-10 inline-flex items-center justify-center gap-2 ${
          onRedFill ? "group-hover:text-brand" : "group-hover:text-white"
        }`}
      >
        {children}
      </span>
    </Comp>
  );
}
