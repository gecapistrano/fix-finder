import "./globals.css";
import { SiteFooter } from "./site-footer";

// The favicon is generated from app/icon.svg by the App Router file convention.
export const metadata = {
  title: "Fix Finder — photograph the damage, get a repair plan",
  description:
    "Take a photo of the damage. Fix Finder works out whether super glue can repair it, how much to use, and the steps to follow.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-ink">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
