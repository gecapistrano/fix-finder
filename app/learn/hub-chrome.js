import Link from "next/link";

import { copy } from "../copy";
import { VENDOR } from "../links";

/**
 * Chrome for the Learning Hub.
 *
 * The hub is presented as its own small site sitting beside the scanner, so it
 * carries a header, search, and footer of its own rather than inheriting the
 * scanner's layout.
 */

const NAV = [
  { label: "Guides", href: VENDOR.knowledge },
  { label: "Materials", href: VENDOR.knowledge },
  { label: "Techniques", href: VENDOR.knowledge },
  { label: "Knowledge", href: VENDOR.knowledge, current: true },
  { label: "Community", href: "/community" },
  { label: "Support", href: VENDOR.support },
];

export function HubChrome() {
  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="shrink-0" aria-label={copy.brand}>
          <HubMark />
        </Link>
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-[13px] text-[#333] hover:text-brand ${
                item.current ? "font-bold text-brand" : "font-medium"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-[12px] text-[#8a8a8a]">
          <a href={VENDOR.knowledge} className="inline-flex items-center gap-1 hover:text-brand">
            <GlobeIcon />
            EN
          </a>
          <span className="hidden h-4 w-px bg-[#cfcfcf] sm:block" aria-hidden />
          <Link href="/" className="hidden hover:text-brand sm:inline">
            {copy.hubTitle}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-4 pb-3 md:px-6">
        <form
          action={VENDOR.knowledge}
          method="get"
          className="flex min-w-0 flex-1 items-center rounded-full bg-[#f3f3f3] px-4 py-2.5"
        >
          <SearchIcon />
          <input
            name="q"
            type="search"
            placeholder="Find repair guides and materials"
            className="ml-2 w-full bg-transparent text-sm text-[#333] outline-none placeholder:text-[#8a8a8a]"
          />
        </form>
        <Link
          href="/community"
          className="hidden shrink-0 items-center gap-2 text-[13px] font-medium text-[#333] hover:text-brand sm:inline-flex"
        >
          {copy.communityTitle}
          <UserIcon />
        </Link>
      </div>
    </header>
  );
}

export function HubFooter() {
  return (
    <footer className="bg-[#2b2b2b] text-white">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-8 md:px-6">
        <HubMark invert />
        <p className="text-xs text-white/80">{copy.hubTitle}</p>
      </div>
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-8 px-4 pb-12 sm:grid-cols-4 md:px-6">
        {["Guides", "Help", "Resource centre", "Community"].map((heading) => (
          <div key={heading}>
            <p className="text-sm font-bold">{heading}</p>
          </div>
        ))}
      </div>
    </footer>
  );
}

/** Wordmark: a drop of adhesive joining two halves. Drawn, not an image file. */
function HubMark({ invert = false }) {
  const ink = invert ? "#ffffff" : "#2b2b2b";
  const accent = invert ? "#ffffff" : "#dc2626";
  return (
    <svg viewBox="0 0 150 40" className="h-8 w-auto" role="img" aria-label={copy.brand}>
      <path
        d="M12 26c0-5 6-10 6-10s6 5 6 10a6 6 0 1 1-12 0Z"
        fill={accent}
      />
      <text
        x="32"
        y="26"
        fill={ink}
        fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
        fontSize="17"
        fontWeight="700"
      >
        Fix Finder
      </text>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 8h12M8 2c-2.2 1.8-3.4 4-3.4 6s1.2 4.2 3.4 6c2.2-1.8 3.4-4 3.4-6S10.2 3.8 8 2Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[#555]" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="10" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 16c.8-2.6 2.8-4 5.5-4s4.7 1.4 5.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
