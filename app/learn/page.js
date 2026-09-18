import { VENDOR } from "../links";
import {
  FIX_FINDER_CTA,
  HERO,
  LIBRARY,
  PATHWAYS,
  SIGNUP,
  STORY,
  SUPPORT,
} from "./content";
import { HubChrome, HubFooter } from "./hub-chrome";

const pillOutline =
  "inline-flex items-center justify-center rounded-full border border-[#333] bg-white px-6 py-3 text-sm font-semibold text-[#333] hover:bg-[#f3f3f3]";
const pillRed =
  "inline-flex items-center justify-center rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white hover:bg-brand-hover";
const pillWhite =
  "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#333] hover:bg-white/90";

/**
 * Consumer Learning Hub — lessons sit beside the scanner as their own small site.
 */

export default function LearningHubPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <HubChrome />

      <main className="flex-1 bg-ice">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 md:gap-8 md:px-6 md:py-14">
          <section className="grid items-center gap-8 md:grid-cols-2">
            <h1 className="text-5xl font-extrabold leading-none tracking-tight text-brand md:text-6xl">
              {HERO.title}
            </h1>
            <div className="max-w-md md:justify-self-end">
              <p className="text-base leading-relaxed text-[#333]">{HERO.lead}</p>
              <a href={HERO.href} className={`${pillRed} mt-6`}>
                {HERO.cta}
              </a>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {PATHWAYS.map((item) => {
              const red = item.theme === "red";
              return (
                <article key={item.id} className="flex flex-col bg-white">
                  <div className="aspect-[16/10] overflow-hidden bg-[#e8eef2]">
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div
                    className={`flex min-h-[260px] flex-1 flex-col px-6 py-7 md:px-8 md:py-8 ${
                      red ? "bg-brand text-white" : "bg-white text-[#333]"
                    }`}
                  >
                    <h2 className="text-2xl font-bold">{item.title}</h2>
                    <p
                      className={`mt-3 text-sm leading-relaxed ${
                        red ? "text-white/95" : "text-[#333]"
                      }`}
                    >
                      {item.body}
                    </p>
                    <a
                      href={item.href}
                      className={`mt-auto w-fit pt-6 ${red ? pillWhite : `${pillOutline} gap-2`}`}
                    >
                      {item.cta}
                      <span aria-hidden>→</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </section>

          <section id="try-fix-finder" className="scroll-mt-24 bg-brand px-6 py-10 md:px-10 md:py-14">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold text-white md:text-4xl">
                  {FIX_FINDER_CTA.title}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white md:text-base">
                  {FIX_FINDER_CTA.body}
                </p>
                <a href={FIX_FINDER_CTA.href} className={`${pillWhite} mt-6`}>
                  {FIX_FINDER_CTA.cta}
                  <span aria-hidden>→</span>
                </a>
              </div>
              <img
                src={FIX_FINDER_CTA.image}
                alt="Universal Super Glue"
                className="mx-auto h-52 w-auto object-contain drop-shadow-xl md:h-64"
              />
            </div>
          </section>

          <section className="flex flex-col items-start gap-6 bg-white px-6 py-6 md:flex-row md:items-center md:px-8 md:py-8">
            <img
              src={STORY.image}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-[#333] md:text-2xl">{STORY.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#555]">{STORY.body}</p>
            </div>
            <a href={STORY.href} className={`${pillOutline} shrink-0`}>
              {STORY.cta}
            </a>
          </section>

          <section className="flex flex-col items-start gap-6 bg-white px-6 py-6 md:flex-row md:items-center md:px-8 md:py-8">
            <UserPlusIcon />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-brand md:text-2xl">{SIGNUP.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#555]">{SIGNUP.body}</p>
            </div>
            <a href={SIGNUP.href} className={`${pillRed} shrink-0`}>
              {SIGNUP.cta}
            </a>
          </section>

          <section className="bg-white px-6 py-8 md:px-8 md:py-10">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <img
                src={LIBRARY.image}
                alt=""
                className="h-56 w-full object-cover md:h-72"
              />
              <div>
                <h2 className="text-3xl font-bold text-[#111] md:text-4xl">{LIBRARY.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-[#333] md:text-base">
                  {LIBRARY.body}
                </p>
                <a href={VENDOR.knowledge} className={`${pillOutline} mt-6`}>
                  {LIBRARY.cta}
                </a>
              </div>
            </div>
          </section>

          <section className="bg-brand px-6 py-10 md:px-10 md:py-14">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold text-white md:text-4xl">{SUPPORT.title}</h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-white md:text-base">
                  {SUPPORT.body}
                </p>
                <a href={VENDOR.support} className={`${pillWhite} mt-6`}>
                  {SUPPORT.cta}
                  <span aria-hidden>→</span>
                </a>
              </div>
              <img
                src={SUPPORT.image}
                alt=""
                className="h-56 w-full object-cover md:h-72"
              />
            </div>
          </section>
        </div>
      </main>
      <HubFooter />
    </div>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 text-[#333]" fill="none" aria-hidden>
      <circle cx="20" cy="16" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 36c1.2-6 6-9 12-9s10.8 3 12 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M36 14v12M30 20h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
