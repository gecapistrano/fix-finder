import { copy } from "./copy";
import { VENDOR } from "./links";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-paper px-4 py-5 print:hidden">
      <div className="mx-auto max-w-md md:max-w-3xl">
        <p className="text-[11px] leading-relaxed text-muted">
          <span className="font-bold text-brand">{copy.dataTitle}</span>{" "}
          {copy.dataNote}{" "}
          <a
            href={VENDOR.contact}
            className="font-semibold text-brand underline underline-offset-2"
          >
            {copy.dataContact}
          </a>
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted/80">
          {copy.legalTrademark}
        </p>
      </div>
    </footer>
  );
}
