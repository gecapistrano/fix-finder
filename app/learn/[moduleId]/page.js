import { notFound } from "next/navigation";
import { getModule, MODULES } from "../content";
import { ModuleView } from "../module-view";

// `module` is a reserved binding in CommonJS scope, so the lesson objects are
// named `lesson` here even though the route segment is still `moduleId`.
export function generateStaticParams() {
  return MODULES.map((lesson) => ({ moduleId: lesson.id }));
}

export async function generateMetadata({ params }) {
  const { moduleId } = await params;
  const lesson = getModule(moduleId);
  if (!lesson) {
    return { title: "Learning Hub | Fix Finder" };
  }
  return {
    title: `${lesson.title} | Fix Finder Learning Hub`,
    description: lesson.problem,
  };
}

export default async function ModulePage({ params }) {
  const { moduleId } = await params;
  const lesson = getModule(moduleId);
  if (!lesson) {
    notFound();
  }
  return <ModuleView module={lesson} />;
}
