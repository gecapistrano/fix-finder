/**
 * Shared button hierarchy for the whole app.
 *
 * Primary   — solid red, white text. The one action we want taken on a screen.
 * Secondary — outlined red on white. A supporting or alternative action.
 * Tertiary  — text-only link style. Low-emphasis, "get me out of here" actions.
 *
 * Combine with a size helper (buttonBlock for full-width stacked mobile buttons).
 */
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

const SIZE_MD = "px-4 py-3.5";
const SIZE_SM = "px-3.5 py-2.5 text-sm";

export const buttonPrimary = `${BASE} ${SIZE_MD} bg-brand text-white shadow-[0_10px_24px_-10px_rgba(225,0,15,0.55)] hover:bg-brand-hover hover:shadow-[0_14px_30px_-10px_rgba(225,0,15,0.6)]`;

export const buttonPrimarySm = `${BASE} ${SIZE_SM} bg-brand text-white shadow-[0_8px_18px_-8px_rgba(225,0,15,0.55)] hover:bg-brand-hover`;

export const buttonSecondary = `${BASE} ${SIZE_MD} border-2 border-brand bg-white text-brand hover:bg-brand-soft`;

export const buttonSecondarySm = `${BASE} ${SIZE_SM} border-2 border-brand bg-white text-brand hover:bg-brand-soft`;

export const buttonTertiary =
  "inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand underline underline-offset-2 transition-opacity duration-200 hover:opacity-70 active:opacity-50 disabled:cursor-not-allowed disabled:opacity-40";

export const buttonGhostIcon =
  "flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink transition-all duration-200 hover:border-brand hover:text-brand hover:-translate-y-0.5 active:translate-y-0 active:scale-95";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
