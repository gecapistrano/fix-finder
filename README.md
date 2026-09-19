# Fix Finder

Photograph something broken. Fix Finder works out what it is, what it is made of,
how it failed, and whether a general-purpose super glue can actually repair it —
then tells you how much to use and how to do it.

If the answer is no, it says so. That was the hard part.

> **1st place — Henkel Hackathon PH 2026.**
> Built by a team over the course of the event. This is a debranded public copy:
> the original was built around a specific sponsor product, and all sponsor
> logos, product photography, and site chrome have been removed here. The
> engineering is unchanged.

**Live demo:** [https://fix-finder-gamma.vercel.app/](https://fix-finder-gamma.vercel.app/)

---

## Why it is not just a wrapper around an image model

The easy version of this app recommends glue for everything. That version is
useless, and worse, it sells people a repair that will fail.

The interesting constraint was **honesty**: the advisor has to be willing to
say "this isn't the right product for your problem," and it has to do that
often enough to be trustworthy without doing it so often that it is useless.
Three things came out of that:

**A two-stage AI pipeline.** The first stage is a vision classifier that
identifies the object, material, and damage mode, then makes a suitability
call. When the verdict is "not suitable," the request is handed to a *second*
prompt whose only job is to let the user down usefully — keep the pieces, here
is what to do instead. Splitting these meant the success path could not quietly
learn to rationalise a bad recommendation, because it never writes the refusal
copy.

**Separate timeout budgets.** Gemini latency is spiky under load — measured at
33 s, 44 s, and one outright hang on the same prompt. The classifier gets a
45 s budget and the fallback gets 8 s, both well inside the platform's
`maxDuration`, so a slow upstream fails as a clean retryable 503 instead of the
whole request being killed with nothing usable in it. This was a real bug fixed
during the event, not a precaution.

**A documented dosage heuristic.** There is no official chart for "grams of
cyanoacrylate per crack size," so the app does not pretend there is one. It
uses a stated, tunable heuristic anchored to published application guidance
(roughly one drop per square inch), with multipliers for porous materials,
multi-piece breaks, and rough surfaces, and a floor so it never recommends a
meaningless near-zero dose:

```
grams = max(0.05, bonding_area_cm2 × 0.005 × multipliers)
packs = ceil(grams / pack_size)
```

The reasoning is documented in the system prompt rather than buried, precisely
because it is an estimate.

---

## What is in it

| Area | What it does |
| --- | --- |
| **Scanner** | Photo upload, camera capture, or paste. Returns object, material, damage, suitability, dose, and steps. |
| **Clarifying questions** | When the photo is ambiguous, the model asks one targeted question instead of guessing. |
| **Learning Hub** | Three guided lesson modules (shoes, home, reuse) with branching "what would you do" choices. |
| **Community** | Before/after repair stories with a drag-to-compare slider. |
| **Moderation** | A third AI prompt screens every submitted post server-side before it can appear. |
| **Share cards** | Canvas-rendered 1080×1920 and 1080×1350 images for Instagram and Facebook, plus QR posters. |
| **Export** | Repair steps to clipboard, JPG, or print/PDF. |

## Degrading gracefully

The app is built so that missing infrastructure removes features rather than
breaking the page:

- **No Gemini key?** Set `AI_MOCK=true` and the scanner returns a canned result.
  The whole UI is explorable with zero credentials and zero cost.
- **No Supabase?** The scanner works normally and community posts fall back to
  browser storage. Only the shared feed needs a database.
- **Upstream slow or rate-limited?** Clean, retryable errors rather than hangs.

---

## Running it

```bash
git clone https://github.com/gecapistrano/fix-finder.git
cd fix-finder
npm install

cp .env.example .env.local
# For a zero-credential tour, put AI_MOCK=true in .env.local and stop there.
# For real analysis, add GEMINI_API_KEY.

npm run dev
```

Open <http://localhost:3000>.

To enable the shared community feed, add the Supabase variables from
`.env.example` and apply the migrations in `supabase/migrations`.

## Retargeting it at a different product

The advisor is deliberately vendor-agnostic. Every product string, image, and
outbound link is driven from [`app/products.js`](app/products.js) and
[`app/links.js`](app/links.js), both of which read `NEXT_PUBLIC_*` variables
with sensible generic defaults. Pointing the whole app at a different adhesive
is a configuration change, not a code change:

```bash
NEXT_PUBLIC_PRODUCT_NAME="Your Adhesive"
NEXT_PUBLIC_PRODUCT_IMAGE="/products/your-image.svg"
NEXT_PUBLIC_PACK_GRAMS=5
NEXT_PUBLIC_VENDOR_SUPPORT="https://example.com/support"
```

---

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Google Gemini via
`@google/genai` · Supabase (Postgres + storage) · deployed on Vercel.

The AI behaviour lives in version-controlled Markdown rather than in string
literals, so prompt changes show up as reviewable diffs:

```
app/api/ask/fixfinder-repair-advisor-system-prompt.md    the classifier
app/api/ask/fixfinder-not-fixable-fallback-prompt.md     the refusal path
app/api/moderate/community-moderator-system-prompt.md    post screening
```

## Notes on assets

The repair photography in `public/learn` and `public/stories` is
AI-generated. The product illustration and the wordmark are drawn as SVG in
this repository. No third-party logos, product photographs, or brand assets are
included.

## License

[MIT](LICENSE). Repair guidance produced by this app is AI-generated and is a
guide, not a guarantee.
