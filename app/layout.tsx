import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME } from "@/lib/app-config.generated";

// APP_NAME is written at compose time from the project name. Env wins so an
// owner can rename without recomposing; the generated constant is the
// committed default, because Next never reads .env.example.
const appName = process.env.NEXT_PUBLIC_APP_NAME || APP_NAME;

// Ships as the default <meta name="description"> on every page, so it is
// indexable, quotable public text. Set NEXT_PUBLIC_APP_DESCRIPTION (or edit
// this file) to a real description of the product.
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  "Shield Wall is a third-person squad tactics battlefield: walk a wobbly jointed Captain, weather every blow, and hold the line.";

/**
 * metadataBase makes every relative OG/twitter image URL absolute. It is
 * optional by design: an unset or malformed NEXT_PUBLIC_BASE_URL must not
 * crash the build, so a bad value degrades to `undefined` (Next then warns and
 * falls back to localhost) rather than throwing inside the metadata module.
 */
function resolveMetadataBase(): URL | undefined {
  const raw = process.env.NEXT_PUBLIC_BASE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: appName,
    // Page-level `title: "Pricing"` renders as "Pricing · <app>".
    template: `%s · ${appName}`
  },
  description: appDescription,
  applicationName: appName,
  openGraph: {
    type: "website",
    siteName: appName,
    title: appName,
    description: appDescription,
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription
  },
  robots: {
    // Public by default; flip to false (or add a robots.ts) for private apps.
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          {/* Keyboard users land here first; visible only while focused. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <SiteHeader />
          {/* A plain wrapper, not <main>: pages ship their own <main>. */}
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
