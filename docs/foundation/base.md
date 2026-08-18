# Next.js 15 base

`base` is the floor every composed app stands on: a Next.js 15 App Router skeleton in strict
TypeScript, Tailwind, two shadcn-style UI primitives, a root layout, a middleware chain, a health
endpoint and a 403 surface. It is always composed — every other pack depends on it. It requires no
environment variables and boots fully with an empty `.env.local`. Nothing here is product code; it
is the frame you hang product code on.

## What you get

The app runs under pnpm (`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm typecheck`). Every route is
wrapped by `app/layout.tsx`, which renders `<AppProviders>` (the composed segments' React context
providers, chained by the kernel), a skip-to-content link and `<SiteHeader>` (brand link plus a nav
whose links are derived from what the composed segments actually ship, so it never links to a route
that does not exist). When the auth pack is composed the header also renders a session control:
signed out it links to `/signin`, signed in it links to Auth.js's sign-out route. It detects the
session by *cookie presence only* and never imports next-auth — `base` has no `dependsOn`. That is a
rendering decision, not a gate; the auth middleware hook still verifies every protected request.
The cookie is only read when `siteCapabilities.hasAuth` is true, so presets without auth keep their
statically prerendered pages.
`middleware.ts` runs on nearly every request and walks an ordered array of hooks contributed by the
composed packs; the first hook that returns a response wins, otherwise the request continues. Auth
gating, when the auth pack is present, is one of those hooks — `base` itself adds none.

Styling is Tailwind 3.4 over a shadcn-style token layer: `app/globals.css` declares
`--background`, `--foreground`, `--card`, `--border`, `--muted-foreground` and friends as RGB
channels, `tailwind.config.ts` maps them to `bg-background`, `text-foreground`, `border-border` etc.,
and the shipped components consume those classes rather than literal `slate-*`. The token values were
taken from the slate/brand palette the components already used, so light mode is unchanged and
turning on dark mode is now a matter of putting `class="dark"` on `<html>`. A `brand` (emerald) ramp
is kept alongside them. `darkMode: "class"` is set and `tailwindcss-animate` is loaded as a plugin,
so `animate-in` and friends resolve. `theme.extend.borderRadius` reads `--radius`, and
`font-sans` is an explicit system stack in `tailwind.config.ts` — base ships no `next/font` call, so
no webfont is loaded and no `--font-*` variable is referenced. `components.json` is checked in with
`cssVariables: true` and the `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils` aliases, so
`pnpm dlx shadcn@latest add <component>` drops registry components straight into the right paths
against the tokens that already exist. `components/ui/button.tsx` and `components/ui/card.tsx` are
the shipped primitives — `Button` takes `asChild` (Radix `Slot`) so a CTA wrapping a `<Link>` emits a
single `<a>` instead of nesting a `<button>` inside one, and exports `buttonVariants` for the cases
where you need the classes without the element; `CardTitle` takes `as` (default `h2`) so a card
never skips a heading level. `cn()` in `lib/utils.ts` is the clsx + tailwind-merge helper used
instead of string concatenation. `GET /api/health` returns `{ ok, service, ts }` — `service` is the app's own name
(`NEXT_PUBLIC_APP_NAME || APP_NAME`) — and is the one route guaranteed to exist in every preset. `app/forbidden.tsx` renders with HTTP 403 whenever server code calls Next's
`forbidden()`, enabled by `experimental.authInterrupts` in `next.config.ts`.

## Files this pack owns

`*.generated.*` files are written by AMC's compose kernel and overwritten on every recompose —
editing them is pointless. `*.local.*` files are created once, if missing, and are yours. Everything
else is foundation source: extend it, do not replace it, and expect a recompose to re-copy it.
`segments/OWNERSHIP.md` is authoritative.

| Path | What it is | Who may edit |
| --- | --- | --- |
| `app/layout.tsx` | Root layout; `metadata`, `<AppProviders>`, `<SiteHeader>` | base — extend carefully, overwritten on recompose |
| `app/globals.css` | Tailwind entry + body background gradient | base |
| `app/forbidden.tsx` | 403 surface for `forbidden()` | base — app-specific styling does not belong here |
| `app/not-found.tsx` | 404 surface for unmatched routes and `notFound()` | base — app-specific styling does not belong here |
| `app/icon.svg` | Favicon (Next metadata file convention) | base — replace with your own mark |
| `app/api/health/route.ts` | `GET /api/health`, `force-dynamic` | base |
| `components/site-header.tsx` | Header; reads `siteNavLinks` + `siteCapabilities`, renders the session control | base |
| `components/providers/app-providers.tsx` | Thin wrapper over the generated provider chain | base |
| `components/ui/button.tsx` | `Button` (cva: `default`/`brand`/`outline`/`ghost`, `default`/`sm`/`lg`); `asChild` prop; also exports `buttonVariants` | base — add variants, do not fork |
| `components/ui/card.tsx` | `Card`, `CardTitle` (`as`, default `h2`), `CardDescription` | base |
| `components.json` | shadcn CLI config: `style: default`, `rsc`, `cssVariables: true`, `baseColor: slate`, `@/` aliases | base — keep in sync with `tailwind.config.ts` / `globals.css` |
| `lib/utils.ts` | `cn()` | base |
| `middleware.ts` | Runs `allMiddlewareHooks`; matcher excludes `_next/static`, `_next/image`, `favicon.ico` | base |
| `next.config.ts` | `reactStrictMode`, `experimental.authInterrupts` | base |
| `tailwind.config.ts` | `darkMode: "class"`, content globs (`app`, `components`, `lib`), `brand` palette, the shadcn token colours as `rgb(var(--x) / <alpha-value>)`, `borderRadius` from `--radius`, system `font-sans` stack, accordion keyframes, `plugins: [tailwindcss-animate]` | base — extend `theme.extend` |
| `postcss.config.mjs`, `tsconfig.json`, `next-env.d.ts` | Toolchain; `allowJs: false`, `strict`, `@/*` → repo root | base |
| `pnpm-workspace.yaml` | Approves `esbuild` + `sharp` builds (pnpm 10 and 11 spellings) | base — do not delete |
| `package.json` | Scaffold seed; the kernel merges every pack's deps and scripts into it | kernel merge |
| `README.md` | `{{AMC_PROJECT_NAME}}` / `{{AMC_GOAL}}` are substituted at compose | app |
| `.gitignore` | Ignores `.env*` except `.env.example` | app |
| `lib/site-nav.generated.ts` | `siteCapabilities`, `siteNavLinks` — derived from composed `provides` | kernel only |
| `components/providers/registry.generated.tsx` | `GeneratedProviders` chain | kernel only |
| `lib/middleware/hooks.generated.ts` | `generatedHooks`, `allMiddlewareHooks` | kernel only |
| `app/page.tsx` | Synthesized placeholder home **only** when no pack owns `/` | kernel only |
| `components/providers/registry.local.tsx` | `localProviders` — appended after pack providers | app / agents |
| `lib/middleware/hooks.local.ts` | `localHooks` — appended after pack hooks | app / agents |

## Extension points

**Add a middleware rule** — never edit `middleware.ts` or `hooks.generated.ts`; append to
`localHooks`. Local hooks run *after* every pack hook, so an auth redirect still wins.

```ts
// lib/middleware/hooks.local.ts
import { NextResponse, type NextRequest } from "next/server";

type MiddlewareHook = (
  req: NextRequest
) => NextResponse | null | void | Promise<NextResponse | null | void>;

function maintenanceGate(req: NextRequest) {
  if (process.env.MAINTENANCE !== "1") return null;          // null = fall through
  if (req.nextUrl.pathname.startsWith("/api/health")) return null;
  return NextResponse.rewrite(new URL("/maintenance", req.url));
}

export const localHooks: MiddlewareHook[] = [maintenanceGate];
```

**Add a React context provider** — it wraps every page, because `app/layout.tsx` renders the chain.

```tsx
// components/providers/registry.local.tsx
import type { ReactNode } from "react";
import { CartProvider } from "@/components/product/cart-provider";

export const localProviders: Array<(p: { children: ReactNode }) => ReactNode> = [CartProvider];
```

**Add a page** — product routes belong under `app/(product)/**` so a recompose cannot stomp them.
Reuse the primitives rather than writing new button/card components.

```tsx
// app/(product)/games/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Games" };

export default function GamesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Card className="space-y-4">
        <CardTitle>This week</CardTitle>
        <CardDescription>Pick a match and reserve your spot.</CardDescription>
        <Button variant="brand" size="lg">Reserve</Button>
      </Card>
    </main>
  );
}
```

## Placeholder content

- **The app name.** `app/layout.tsx` (`metadata.title`) and
  `components/site-header.tsx` both read
  `process.env.NEXT_PUBLIC_APP_NAME || APP_NAME`, where `APP_NAME` comes from
  the kernel-generated `lib/app-config.generated.ts` — committed source, written
  from the project name at compose time. Env wins, so an owner can rename
  without recomposing.
  Seeding `.env.example` alone was not enough and used to be the bug here: Next
  never reads that file, and the composed `.gitignore` excludes every other
  `.env*`. **If a page still renders the literal `"AMC App"`, something is
  wrong** — check the rendered header rather than assuming.
- **`metadata.description`** defaults to `"<app name> — built with Next.js."`. That is a
  placeholder shipped to search engines: set `NEXT_PUBLIC_APP_DESCRIPTION`, or edit
  `app/layout.tsx`, and write a real one. The same string is reused for the openGraph and twitter
  cards, and `app/icon.svg` is a generic mark — replace both before launch.
- **The synthesized `app/page.tsx`** ("AMC composed foundation" / "Your app is ready to build") is
  what a preset without the `marketing` pack serves at `/`. It is a placeholder home page; ship a
  real one (see the Gotchas note about where to put it).
- **`README.md`** below the substituted goal is generic template prose about segments.
- The `brand` emerald ramp and the `globals.css` radial gradients are a neutral default, not a
  brand. Changing them is expected, not risky.

## Environment

| Var | Required | Absent behaviour |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | optional | Falls back to `APP_NAME` from `lib/app-config.generated.ts`, which compose writes from the project name. The app runs normally either way. |
| `NEXT_PUBLIC_APP_DESCRIPTION` | optional | Falls back to a generated placeholder description. |
| `NEXT_PUBLIC_BASE_URL` | optional | `metadataBase` is left unset, so Next resolves relative OG/canonical URLs against localhost and warns. A malformed value is ignored rather than throwing. |

`devPosture: "none"` — this pack declares no required environment, so it boots and builds fully with
no configuration at all. Any degraded behaviour in a composed app comes from another pack, never
this one. `NEXT_PUBLIC_*` values are inlined at **build** time: changing it after `pnpm build`
requires a rebuild, not a restart.

## Gotchas

- **`base` ships no `app/page.tsx` on purpose.** The kernel synthesizes one only when no pack
  supplies a `rootPage` hook. If `marketing` is composed it owns `/` via `app/(marketing)/page.tsx`
  — creating `app/page.tsx` yourself then gives Next two files resolving to `/` and the build fails.
  `app/page.tsx` is also a kernel-reserved path: if it was synthesized, a recompose overwrites your
  edits. Put a real home page in the marketing route group, or accept that it is kernel-owned.
- **The token layer is not complete.** The common shadcn tokens exist and work
  (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`,
  `bg-primary`, `ring-ring`, plus `tailwindcss-animate` for `animate-in`), but there is no
  `ring-offset-background` and no `--*-hover` values: `Button`'s default hover is still the literal
  `slate-800`, and `app/forbidden.tsx` / `app/not-found.tsx` use `text-slate-500`, because no token
  carries either colour. Registry components that reference a token not declared in `globals.css`
  still render nothing — check before pasting.
- **Dark mode is wired but not switchable.** `darkMode: "class"` plus a full `.dark` token block
  means the palette flips the moment something adds `class="dark"` to `<html>`; base ships no
  toggle and no `prefers-color-scheme` handling. The literal `slate-800`/`slate-500` classes above
  will not flip with it.
- **Tailwind only scans `app/`, `components/`, `lib/`.** Classes written in files anywhere else
  (`src/`, `db/`, `types/`) are purged from the build and appear as unstyled markup in production
  while looking fine in dev.
- **The middleware matcher covers API routes too.** A hook that redirects on an unauthenticated
  request will redirect `fetch()` calls, not just page loads.
- **`allowJs: false`.** Do not add `.js` or `.jsx` files anywhere; they are excluded from the
  program and will fail `pnpm typecheck` in confusing ways. Ship `.ts`/`.tsx` only.
- **`experimental.authInterrupts` is load-bearing.** Removing it breaks `forbidden()` — role gates
  degrade from a 403 into a generic 500 through the error boundary.
- **`pnpm-workspace.yaml` is install-critical.** Without its `esbuild`/`sharp` approvals, pnpm 10+
  exits non-zero with `ERR_PNPM_IGNORED_BUILDS`, which is exactly the install command AMC runs.
- **The header nav is not locally extensible.** `siteNavLinks` comes from composed capabilities, and
  editing `lib/site-nav.generated.ts` is futile. To add your own nav entry you must edit
  `components/site-header.tsx`, which is base-owned and re-copied on recompose — note that as a
  known cost rather than reaching for the generated file.
- **`SiteHeader` is an async server component.** It takes an optional `authSlot` node so a pack that
  *can* import next-auth may inject a real `signOut()` control in place of the built-in link; it
  cannot be rendered from a client component.
