"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BeforeAfterSlider } from "../before-after-slider";
import { buttonPrimary, buttonSecondary, cx } from "../button-styles";
import { copy } from "../copy";
import { HoverPress } from "../hover-press";
import { VENDOR } from "../links";
import { SUPER_GLUE_IMAGE } from "../products";
import { nextModule } from "./content";
import { HubChrome, HubFooter } from "./hub-chrome";

const pillOutline =
  "inline-flex items-center justify-center rounded-full border border-[#333] bg-white px-6 py-3 text-sm font-semibold text-[#333] hover:bg-[#f3f3f3]";
const pillRed =
  "inline-flex items-center justify-center rounded-full bg-brand px-7 py-3 text-sm font-semibold text-white hover:bg-brand-hover";

export function ModuleView({ module }) {
  const [selectedId, setSelectedId] = useState("");
  const [caseIndex, setCaseIndex] = useState(0);
  const resultRef = useRef(null);
  const selected = module.options.find((option) => option.id === selectedId) || null;
  const currentCase = module.cases?.[caseIndex] || null;
  const tutorial =
    module.style === "quiz" && currentCase && selected
      ? module.options.find((option) => option.id === currentCase.answer) || selected
      : selected;
  const upcoming = nextModule(module.id);

  useEffect(() => {
    if (tutorial) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tutorial]);

  function pick(id) {
    setSelectedId(id);
  }

  function nextCase() {
    setSelectedId("");
    setCaseIndex((value) => (value + 1) % module.cases.length);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <HubChrome />
      <main className="flex-1 bg-ice">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12">
          <p className="text-sm font-semibold text-brand">
            <Link href="/learn" className="inline-flex items-center gap-1.5 hover:underline">
              ← {copy.backToHub}
            </Link>
          </p>

          <section className="overflow-hidden bg-white">
            <div className="grid md:grid-cols-2">
              <img
                src={module.image}
                alt=""
                className="h-56 w-full object-cover md:h-full md:min-h-[320px]"
              />
              <div className="flex flex-col justify-center px-6 py-8 md:px-10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                  {module.number}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#111] md:text-4xl">
                  {module.title}
                </h1>
                <p className="mt-2 text-base font-medium text-[#555]">{module.subtitle}</p>
                <p className="mt-4 text-sm leading-relaxed text-[#333]">{module.problem}</p>
              </div>
            </div>
          </section>

          <section className="bg-brand px-6 py-6 text-white md:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">
              {copy.lessonHook}
            </p>
            <p className="mt-2 text-2xl font-bold leading-snug md:text-3xl">“{module.hook}”</p>
          </section>

          {module.examples?.length ? (
            <section className="bg-white px-6 py-8 md:px-8">
              <h2 className="text-xl font-bold text-[#111]">{copy.examplesHeading}</h2>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {module.examples.map((example) => (
                  <li key={example.label} className="overflow-hidden bg-ice">
                    <img
                      src={example.image}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                    <p className="px-2 py-2 text-center text-xs font-semibold text-[#333]">
                      {example.label}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="bg-white px-6 py-8 md:px-8">
            <h2 className="text-xl font-bold text-[#111]">{copy.whatYouLearn}</h2>
            <ol className="mt-5 grid gap-3 md:grid-cols-2">
              {module.learn.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-xl bg-ice px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-[#333]">{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="try-this" className="scroll-mt-24 bg-white px-6 py-8 md:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
              {copy.tryThis}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#111] md:text-3xl">
              {module.interactiveTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#555]">
              {module.interactiveLead}
            </p>

            {module.style === "quiz" && currentCase ? (
              <QuizPrompt
                currentCase={currentCase}
                options={module.options}
                selectedId={selectedId}
                onPick={pick}
              />
            ) : (
              <ChoiceGrid
                options={module.options}
                selectedId={selectedId}
                onPick={pick}
              />
            )}
          </section>

          <div ref={resultRef} className="scroll-mt-24">
            {tutorial ? (
              <ResultCard
                selected={tutorial}
                quiz={module.style === "quiz" ? currentCase : null}
                guessId={selectedId}
              />
            ) : null}
          </div>

          {module.style === "quiz" && tutorial ? (
            <HoverPress type="button" onClick={nextCase} className={`${buttonSecondary} w-fit`}>
              {copy.tryAnotherItem}
            </HoverPress>
          ) : null}

          <CampaignCloser />

          <section className="flex flex-col items-start justify-between gap-4 bg-white px-6 py-6 sm:flex-row sm:items-center md:px-8">
            <p className="text-sm text-[#555]">
              {upcoming.number}: {upcoming.title}
            </p>
            <a href={`/learn/${upcoming.id}`} className={pillRed}>
              {copy.nextLesson} →
            </a>
          </section>
        </div>
      </main>
      <HubFooter />
    </div>
  );
}

function ChoiceGrid({ options, selectedId, onPick }) {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {options.map((option) => {
        const active = option.id === selectedId;
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onPick(option.id)}
              className={cx(
                "group flex h-full w-full flex-col overflow-hidden border-2 bg-ice text-left transition-all",
                active
                  ? "border-brand shadow-[0_12px_24px_-16px_rgba(225,0,15,0.55)]"
                  : "border-transparent hover:-translate-y-0.5 hover:border-brand/40",
              )}
            >
              <span className="relative aspect-[16/10] overflow-hidden bg-[#e8eef2]">
                <img
                  src={option.image}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {option.emoji ? (
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-lg">
                    {option.emoji}
                  </span>
                ) : null}
              </span>
              <span className="px-4 py-3 text-sm font-bold text-[#111]">{option.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function QuizPrompt({ currentCase, options, selectedId, onPick }) {
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="overflow-hidden bg-ice">
        <img
          src={currentCase.image}
          alt=""
          className="aspect-[4/3] w-full object-cover"
        />
        <p className="px-4 py-3 text-sm font-bold text-[#111]">{currentCase.title}</p>
      </div>
      <div>
        <p className="text-lg font-bold text-[#111]">{copy.canGlueFix}</p>
        <div className="mt-4 grid gap-2.5">
          {options.map((option) => (
            <HoverPress
              key={option.id}
              type="button"
              onClick={() => onPick(option.id)}
              className={cx(
                option.id === selectedId ? buttonPrimary : buttonSecondary,
                "w-full",
              )}
            >
              {option.label}
            </HoverPress>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ selected, quiz, guessId }) {
  const matched = quiz ? guessId === quiz.answer : true;
  const showFix = selected.kind === "fix";
  const showAdvice = selected.kind === "advice" || selected.kind === "dispose";

  return (
    <section className="animate-fade-up bg-white px-6 py-8 md:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
        {copy.yourNextStep}
      </p>
      {quiz ? (
        <p className="mt-2 text-sm font-semibold text-brand">
          {matched ? copy.rightCall : copy.betterCall}
        </p>
      ) : null}
      <h3 className="mt-2 text-2xl font-bold text-[#111]">
        {quiz ? quiz.title : selected.label}
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#333]">{selected.result}</p>

      {selected.before && selected.after ? (
        <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-2xl border border-line">
          <BeforeAfterSlider
            before={selected.before}
            after={selected.after}
            title={selected.label}
          />
        </div>
      ) : null}

      {selected.steps?.length ? (
        <ol className="mt-6 space-y-3">
          {selected.steps.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-xl bg-ice px-4 py-3 text-sm text-[#333]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {showFix ? (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-brand-soft px-4 py-4 sm:flex-row sm:items-center">
          <img
            src={SUPER_GLUE_IMAGE}
            alt="Universal Super Glue"
            className="mx-auto h-20 w-auto object-contain sm:mx-0"
          />
          <p className="flex-1 text-sm font-semibold text-brand">{selected.product}</p>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-ice px-4 py-4 text-sm font-semibold text-[#333]">
          {selected.product}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        {showFix ? (
          <HoverPress as="a" href="/#upload" className={buttonPrimary}>
            {copy.openFixFinder}
          </HoverPress>
        ) : null}
        {showAdvice ? (
          <HoverPress
            as="a"
            href={VENDOR.support}
            className={buttonPrimary}
          >
            {copy.contactSupport}
          </HoverPress>
        ) : null}
        {selected.kind === "fix" || selected.kind === "reuse" ? (
          <HoverPress as="a" href="/community/write" className={buttonSecondary}>
            {copy.writePost}
          </HoverPress>
        ) : null}
      </div>
    </section>
  );
}

function CampaignCloser() {
  const steps = [
    { icon: "🎓", title: copy.learnStep, note: copy.learnStepNote, href: "#try-this", cta: copy.tryThis },
    { icon: "🔧", title: copy.fixStep, note: copy.fixStepNote, href: "/#upload", cta: copy.openFixFinder },
    { icon: "📸", title: copy.shareStep, note: copy.shareStepNote, href: "/community/write", cta: copy.writePost },
  ];

  return (
    <section className="bg-brand px-6 py-10 text-white md:px-10">
      <h2 className="text-2xl font-extrabold md:text-3xl">{copy.learnFixShare}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/95">{copy.campaignLoop}</p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="bg-white/10 px-5 py-5">
            <p className="text-2xl" aria-hidden>
              {step.icon}
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
              {index + 1}
            </p>
            <p className="mt-1 text-lg font-bold">{step.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">{step.note}</p>
            {step.href ? (
              <a href={step.href} className={`${pillOutline} mt-4`}>
                {step.cta}
              </a>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-lg font-bold">{copy.shareHashtag}</p>
      <p className="mt-1 text-sm text-white/90">{copy.shareInviteHub}</p>
    </section>
  );
}
