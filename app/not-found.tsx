import Link from "next/link";

/**
 * Rendered with HTTP 404 for any unmatched route, and whenever server code
 * calls notFound(). Owned by base so every composed app has a real 404 surface
 * that matches app/forbidden.tsx.
 *
 * Base-owned: a recompose overwrites this file, so app-specific styling does
 * not belong here (see segments/OWNERSHIP.md).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you asked for does not exist, or it moved. Check the address,
          or head back and try again from the home page.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
