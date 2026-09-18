"use client";

import Link from "next/link";

import { BuyMenu } from "./buy-menu";
import { copy } from "./copy";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-brand/95 px-4 py-3.5 text-white shadow-[0_4px_20px_rgba(131,0,9,0.3)] backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between gap-4 md:max-w-3xl">
        <Link
          href="/"
          className="text-base font-bold leading-none tracking-tight transition-transform duration-200 ease-out hover:scale-[1.02]"
        >
          {copy.brand}
        </Link>
        <BuyMenu variant="header" className="shrink-0" />
      </div>
    </header>
  );
}
