"use client";

import { useEffect, useRef, useState } from "react";
import { buttonPrimary, cx } from "./button-styles";
import { copy } from "./copy";
import { VENDOR } from "./links";

// Retailers are listed by name only. Reproducing each marketplace's logo would
// mean shipping third-party trademarks in the repo for no functional gain.
const SHOPS = [
  { id: "shopee", label: copy.buyShopee, href: VENDOR.shopee },
  { id: "lazada", label: copy.buyLazada, href: VENDOR.lazada },
  { id: "stores", label: copy.buyStoreLocator },
];

export function BuyMenu({ className = "", variant = "result" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isHeader = variant === "header";

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu = (
    <ul
      role="menu"
      className={
        isHeader
          ? "absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_32px_-16px_rgba(59,59,59,0.45)]"
          : "rounded-b-xl border-2 border-t-0 border-brand bg-white shadow-[0_12px_24px_-12px_rgba(225,0,15,0.35)]"
      }
    >
      {SHOPS.map((shop, index) => (
        <li key={shop.id} role="none">
          <ShopRow
            shop={shop}
            roundTop={isHeader && index === 0}
            last={index === SHOPS.length - 1}
            onPick={() => setOpen(false)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      ref={rootRef}
      className={cx(isHeader ? "relative" : "relative z-20 min-w-0", className)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={
          isHeader
            ? cx(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors duration-200",
                open
                  ? "border-white bg-white text-brand"
                  : "border-white/50 bg-transparent text-white hover:border-white",
              )
            : cx(
                buttonPrimary,
                "w-full active:scale-100",
                open && "rounded-b-none shadow-none",
              )
        }
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isHeader ? copy.catalog : copy.buyProduct}
          <ChevronIcon open={open} />
        </span>
      </button>
      {isHeader ? (
        open ? menu : null
      ) : (
        <div
          className={cx(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">{menu}</div>
        </div>
      )}
    </div>
  );
}

function ShopRow({ shop, roundTop = false, last, onPick }) {
  const classes = cx(
    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-brand-soft focus-visible:bg-brand-soft focus-visible:outline-none",
    roundTop && "rounded-t-[10px]",
    last && "rounded-b-[10px]",
  );

  const inner = (
    <>
      <span className="flex h-8 w-10 shrink-0 items-center justify-center">
        <StorefrontIcon />
      </span>
      <span>{shop.label}</span>
    </>
  );

  if (shop.href) {
    return (
      <a
        role="menuitem"
        href={shop.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onPick}
        className={classes}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onPick} className={classes}>
      {inner}
    </button>
  );
}

function StorefrontIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M4 9h16l-1 10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L4 9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V6a3 3 0 1 1 6 0v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
