/**
 * Learning Hub content, shaped like DECP / AEM modules on
 * next.brand-adhesives.com (RAQN platform).
 *
 * MODULES is the original lesson content. Layout chrome (hero, pathways,
 * story, library, support) mirrors the Knowledge Hub page structure.
 */

export const HERO = {
  title: "Learning hub",
  lead:
    "Short lessons for everyday repairs — then fix it, and share what you saved.",
  cta: "Let's fix it!",
  href: "/#upload",
};

export const STORY = {
  title: "Learn, fix, and share",
  body: "A short tutorial, then a step-by-step repair with the recommended product. When you are done, upload your before and after. #FixBeforeYouToss",
  cta: "Try Fix Finder",
  href: "/#upload",
  image: "/learn/innovation.jpg",
};

export const SIGNUP = {
  title: "Sign up for easy access to our expert resources",
  body: "Save your details once to come back to Fix Finder, the lessons, and community stories any time.",
  cta: "Sign up",
  href: "https://next.brand-adhesives.com/ph/en.html",
};

export const LIBRARY = {
  title: "Explore our how-to library",
  body: "Need certified industrial training, data sheets, or expert papers? Those live on manufacturer knowledge hubs and professional training portals — built for professionals, open to anyone who wants to go further.",
  cta: "Go to technical library",
  image: "/learn/library.jpg",
};

export const SUPPORT = {
  title: "Looking for support options?",
  body: "Our support centre and experts are ready to help you find the right adhesive when Universal Super Glue is not the match.",
  cta: "Visit support centre",
  image: "/learn/support.jpg",
};

const FIX_STEPS = {
  shoe: [
    "Wipe both faces clean — dust and old glue weaken the bond.",
    "Let the surfaces dry completely.",
    "Apply a thin line of Universal Super Glue. Extra glue squeezes out and weakens the hold.",
    "Press together and hold firmly for about 30 seconds.",
    "Don't wear the shoe for 24 hours.",
  ],
  home: [
    "Identify the material. Rubber, wood trim, ceramic, and hard plastic are often a yes.",
    "Dry-fit the pieces so they close without a gap.",
    "Clean both faces and let them dry.",
    "Apply a thin amount of Universal Super Glue.",
    "Hold for 30 seconds, then leave it overnight before putting weight on it.",
  ],
};

export const MODULES = [
  {
    id: "shoes",
    number: "Module 1",
    title: "Save your favorite pair",
    subtitle: "Shoe and sneaker repairs",
    problem:
      "Sole separation, loose rubber, or a small piece that came off the shoe.",
    learn: [
      "How to tell whether a shoe can be repaired",
      "Choosing the right adhesive for common shoe materials",
      "Proper surface preparation",
      "How much adhesive to apply",
      "How to hold the pieces while it sets",
      "Common mistakes that make the repair fail",
    ],
    hook: "Sole coming off? Don't toss it yet.",
    interactiveTitle: "What's wrong with your shoe?",
    interactiveLead: "Tap the damage that looks like yours. We'll recommend the repair.",
    style: "choice",
    tag: "How-to",
    image: "/learn/module-shoes.jpg",
    options: [
      {
        id: "sole",
        label: "Sole separating",
        image: "/learn/opt-sole.jpg",
        result:
          "This is a strong Universal Super Glue repair when the sole is rubber or similar and the pieces still fit. Clean both surfaces, apply a thin line, and hold firmly for about 30 seconds. Don't wear the shoe for 24 hours.",
        product: "Universal Super Glue · about 1 g · 1 pack",
        steps: FIX_STEPS.shoe,
        kind: "fix",
      },
      {
        id: "rubber",
        label: "Rubber peeling",
        image: "/learn/opt-rubber.jpg",
        result:
          "Peeling rubber usually bonds well if you can press it flat again. Wipe away dust and old residue first. A few drops along the edge is enough — extra glue will squeeze out and weaken the hold.",
        product: "Universal Super Glue · about 0.5–1 g · 1 pack",
        steps: FIX_STEPS.shoe,
        kind: "fix",
      },
      {
        id: "tear",
        label: "Small tear",
        image: "/learn/opt-tear.jpg",
        result:
          "A tear in rubber or leather can often be closed. A tear in cotton, canvas, or wool should not get Super Glue — that reaction can get dangerously hot. If the upper is fabric, talk to customer support.",
        product: "Universal Super Glue · about 0.5 g · 1 pack, if the material is rubber or leather",
        steps: [
          "Check the material. Leather and rubber: continue. Fabric: stop and ask support.",
          "Bring the edges together with no gap.",
          "One thin drop along the tear.",
          "Hold 30 seconds. Wipe squeeze-out immediately.",
        ],
        kind: "fix",
      },
      {
        id: "decor",
        label: "Decorative piece detached",
        image: "/learn/opt-charm.jpg",
        result:
          "Small logos, charms, or hard plastic details are a good fit when both faces are clean and close. One drop, press, and hold. Wipe any squeeze-out immediately.",
        product: "Universal Super Glue · about 0.5 g · 1 pack",
        steps: [
          "Find both faces of the charm or logo.",
          "Wipe them clean and dry.",
          "One drop only — this is a small part.",
          "Press, hold 30 seconds, and leave it overnight.",
        ],
        kind: "fix",
        before: "/stories/bolt-before.jpg?v=2",
        after: "/stories/bolt-after.jpg?v=2",
      },
    ],
  },
  {
    id: "home",
    number: "Module 2",
    title: "Fix it before you toss it",
    subtitle: "Everyday home repairs",
    problem:
      "Small household items breaking or coming loose — handles, frames, ceramics, hooks, and hard plastic pieces.",
    examples: [
      { label: "Cabinet handle", image: "/learn/opt-handle.jpg" },
      { label: "Picture frame", image: "/stories/frame-before.jpg?v=2" },
      { label: "Ceramic mug", image: "/stories/mug-before.jpg?v=2" },
      { label: "Figurine", image: "/stories/figurine-before.jpg?v=2" },
      { label: "Small furniture", image: "/stories/chair-before.jpg?v=2" },
      { label: "Loose hook", image: "/learn/opt-hook.jpg" },
    ],
    learn: [
      "How to identify the material",
      "Which repairs are right for adhesive",
      "Surface preparation",
      "Application technique",
      "Setting and curing time",
      "When not to use adhesive",
    ],
    hook: "Before you buy a replacement, ask: can this still be fixed?",
    interactiveTitle: "Fix or toss?",
    interactiveLead:
      "We are not trying to sell glue for everything. Pick the honest answer — we'll tell you if Universal Super Glue is the right call.",
    style: "quiz",
    tag: "How-to",
    image: "/learn/module-home.jpg",
    cases: [
      {
        id: "frame",
        title: "Picture frame corner split",
        image: "/stories/frame-before.jpg?v=2",
        answer: "yes",
      },
      {
        id: "mug",
        title: "Ceramic mug handle snapped off",
        image: "/stories/mug-before.jpg?v=2",
        answer: "yes",
      },
      {
        id: "chair",
        title: "Wooden chair joint coming apart",
        image: "/stories/chair-before.jpg?v=2",
        answer: "maybe",
      },
      {
        id: "figurine",
        title: "Ceramic figurine head detached",
        image: "/stories/figurine-before.jpg?v=2",
        answer: "yes",
      },
      {
        id: "hook",
        title: "Wall hook pulled off the paint",
        image: "/learn/opt-hook.jpg",
        answer: "maybe",
      },
      {
        id: "tub",
        title: "Cracked food container",
        image: "/learn/opt-packaging.jpg",
        answer: "no",
      },
    ],
    options: [
      {
        id: "yes",
        label: "Yes — learn how",
        result:
          "Cabinet handles, picture frames, ceramic decorations, loose hooks, and hard plastic household parts are often a yes when the break is clean and close-fitting. Learn the steps, then use Universal Super Glue.",
        product: "Universal Super Glue · 0.5–1 g · 1 pack",
        steps: FIX_STEPS.home,
        kind: "fix",
        before: "/stories/mug-before.jpg?v=2",
        after: "/stories/mug-after.jpg?v=2",
      },
      {
        id: "maybe",
        label: "Maybe — get advice",
        result:
          "If the gap is wide, the part carries weight, or you are not sure about the plastic, pause. An adhesive specialist can help you choose the right adhesive instead of forcing Super Glue.",
        product: "Contact customer support",
        kind: "advice",
      },
      {
        id: "no",
        label: "No — safer alternative",
        result:
          "Some items should be replaced or recycled: food-contact interiors, polyethylene or polypropylene (like many food tubs), glass that must stay bonded long-term, or anything that sees high heat. Choosing not to glue is still the right repair decision.",
        product: "Look for a safe replacement, or ask support for another option",
        kind: "advice",
      },
    ],
  },
  {
    id: "reuse",
    number: "Module 3",
    title: "Give it a second life",
    subtitle: "Repair, reuse, and upcycle",
    problem:
      "Everyday items are often thrown away when they are damaged, even though the object is still usable.",
    learn: [
      "How to assess whether an item can be repaired instead of replaced",
      "Which common materials can be bonded",
      "How repairing extends an item's useful life",
      "Simple ways to repurpose a repaired item",
      "When an item should be recycled or disposed of instead",
    ],
    hook: "Broken doesn't always mean it's time to throw it away.",
    interactiveTitle: "Fix, reuse, or recycle?",
    interactiveLead: "Pick the damaged item. We'll explain why — and what to do next.",
    style: "choice",
    tag: "Articles",
    image: "/learn/module-reuse.jpg",
    options: [
      {
        id: "shoe",
        label: "Broken shoe → Fix",
        emoji: "👟",
        image: "/learn/opt-sole.jpg",
        result:
          "If the sole, rubber, or a hard piece came off and the rest of the shoe is sound, repair it. That keeps a favorite pair in use and out of the bin.",
        product: "Universal Super Glue · about 1 g · 1 pack",
        steps: FIX_STEPS.shoe,
        kind: "fix",
      },
      {
        id: "furniture",
        label: "Loose furniture piece → Fix",
        emoji: "🪑",
        image: "/stories/chair-before.jpg?v=2",
        result:
          "A loose accent, trim, or small wood component can often be bonded and kept in service. Skip Super Glue on load-bearing joints that carry a person's weight.",
        product: "Universal Super Glue · about 1 g · 1 pack",
        steps: FIX_STEPS.home,
        kind: "fix",
        before: "/stories/chair-before.jpg?v=2",
        after: "/stories/chair-after.jpg?v=2",
      },
      {
        id: "container",
        label: "Empty container → Reuse / upcycle",
        emoji: "🥫",
        image: "/learn/opt-container.jpg",
        result:
          "If the container is intact, wash it and give it a second job — storage, organizing, or a craft. Do not use Super Glue on the inside of anything that will hold food or drink.",
        product: "No adhesive needed — reuse the item as it is",
        kind: "reuse",
      },
      {
        id: "packaging",
        label: "Damaged plastic packaging → Recycle",
        emoji: "🧴",
        image: "/learn/opt-packaging.jpg",
        result:
          "Torn or empty packaging is rarely worth repairing. Check your local recycling rules and send it the right way.",
        product: "Recycle where facilities exist",
        kind: "recycle",
      },
      {
        id: "unsafe",
        label: "Severely damaged or unsafe → Dispose responsibly",
        emoji: "⚠️",
        image: "/learn/opt-hook.jpg",
        result:
          "If the item is cracked in a way that can cut, fail under weight, or is no longer safe to use, do not glue it back into service. Dispose of it responsibly.",
        product: "Do not repair — dispose of it safely",
        kind: "dispose",
      },
    ],
  },
];

export function getModule(id) {
  return MODULES.find((module) => module.id === id) || null;
}

export function nextModule(id) {
  const index = MODULES.findIndex((module) => module.id === id);
  if (index < 0) {
    return MODULES[0];
  }
  return MODULES[(index + 1) % MODULES.length];
}

export const PATHWAYS = MODULES.map((module, index) => ({
  id: module.id,
  title: module.title,
  body: module.problem,
  image: module.image,
  tag: module.tag,
  theme: index === 1 ? "white" : "red",
  cta: "Start this lesson",
  href: `/learn/${module.id}`,
}));

export const FIX_FINDER_CTA = {
  title: "Ready to fix something?",
  body: "Take a photo of the damage. Fix Finder tells you whether Universal Super Glue can help — and how much to use.",
  cta: "Let's fix it!",
  href: "/#upload",
  image: "/products/super-glue-universal.png",
};
