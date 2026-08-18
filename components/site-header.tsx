import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { siteCapabilities, siteNavLinks } from "@/lib/site-nav.generated";
// Kernel always emits this file. With auth composed it re-exports
// HeaderSessionControls; without auth it is a null stub. base never imports next-auth.
import { SiteHeaderAuth } from "@/components/site-header-auth.generated";

/**
 * Auth.js issues its session cookie under the insecure name over http and the
 * `__Secure-` name over https (@auth/core lib/init.js). Both are checked
 * because the header must be right in dev and behind a TLS proxy.
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token"
];

/**
 * Presence-only check. This is a *rendering* decision, not an authorization
 * one: a forged cookie only makes the header say "Sign out" — every protected
 * route is still gated by the auth middleware hook, which verifies the JWT.
 * Never promote this to a gate.
 */
async function hasSessionCookie() {
  const jar = await cookies();
  return SESSION_COOKIE_NAMES.some((name) => Boolean(jar.get(name)?.value));
}

export interface SiteHeaderProps {
  /**
   * Injection seam for packs that can import auth. When provided this replaces
   * the generated auth control, so apps can fully override the session UI.
   */
  authSlot?: ReactNode;
}

/**
 * Header links come from kernel-generated site-nav (only routes the
 * composed segments actually ship). blank-next → Home + Health only.
 *
 * base does not depend on the auth pack (`dependsOn: []`), so the session
 * control is derived from `siteCapabilities.hasAuth` plus the generated
 * SiteHeaderAuth slot, never from a next-auth import.
 */
export async function SiteHeader({ authSlot }: SiteHeaderProps = {}) {
  const name = "Shield Wall";
  const signedIn = siteCapabilities.hasAuth ? await hasSessionCookie() : false;
  // "Sign in" is already in siteNavLinks; drop it once we render our own
  // session control so it cannot appear twice, or appear while signed in.
  const generated = siteCapabilities.hasAuth
    ? siteNavLinks.filter((link) => link.href !== "/signin")
    : siteNavLinks;
  const playLink = { href: "/play", label: "Play" };
  const links = generated.some((link) => link.href === playLink.href)
    ? generated
    : [...generated, playLink];

  const generatedAuth = siteCapabilities.hasAuth ? (
    <SiteHeaderAuth cookieSignedIn={signedIn} />
  ) : null;

  return (
    <header className="border-b border-border/70 bg-card/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          {name}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} className="hover:text-foreground" href={link.href}>
              {link.label}
            </Link>
          ))}
          {authSlot ?? generatedAuth}
        </nav>
      </div>
    </header>
  );
}
