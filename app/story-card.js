import { BeforeAfterSlider } from "./before-after-slider";
import { copy } from "./copy";

export function storyAuthor(story) {
  const name = typeof story?.author === "string" ? story.author.trim() : "";
  return name || copy.anonymous;
}

export function StoryCard({ story }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-18px_rgba(59,59,59,0.32)]">
      <BeforeAfterSlider
        before={story.before}
        after={story.after}
        title={story.title}
      />
      <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
        <div>
          <p className="font-bold leading-snug text-ink">{story.title}</p>
          <p className="mt-1 text-xs text-muted">
            {copy.postedBy} {storyAuthor(story)}
          </p>
        </div>
        {story.product ? (
          <p className="inline-block w-fit rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
            {story.product}
          </p>
        ) : null}
        {story.note ? (
          <p className="text-sm leading-relaxed text-muted">{story.note}</p>
        ) : null}
      </div>
    </article>
  );
}
