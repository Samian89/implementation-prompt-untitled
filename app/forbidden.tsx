import Link from "next/link";

/**
 * Rendered with HTTP 403 whenever server code calls forbidden().
 * Owned by base so every composed app has a real 403 surface, whether or not
 * the auth pack is present.
 *
 * Base-owned: a recompose overwrites this file, so app-specific styling does
 * not belong here (see segments/OWNERSHIP.md).
 */
export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-slate-500">403</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Not allowed
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your account does not have access to this area. If you think that is
          wrong, ask an administrator to grant you the required role.
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
