import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Shield Wall"
};

export default function HomePage() {
  return (
    <main className="pb-20">
      <section className="relative overflow-hidden bg-slate-950 text-slate-50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.22),_transparent_55%)]" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center gap-8 px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300/90">
            Third-person squad tactics
          </p>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Shield Wall</h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Walk a jointed, wobbly Captain onto the field. Spring-damper bones keep you upright until
            the blow is big enough — stumble, knockdown, or stay down. Later you will command the
            line. Today you learn to stand.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="brand" size="lg">
              <Link href="/play">Enter the field</Link>
            </Button>
            <p className="text-sm text-slate-400">WASD to walk · mouse to look · 1 / 2 / 3 to test hits</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-16 md:grid-cols-3">
        <Card>
          <CardTitle>Wobbly skeleton</CardTitle>
          <CardDescription>
            Capsule limbs, spring-damper joints, and active balance. Not a bean. A Captain who
            actually has hips.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Readable blows</CardTitle>
          <CardDescription>
            Force under 20 is a stumble. Twenty to fifty knocks you down for a breath. Above fifty
            is death ragdoll — no gore, just physics.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Built to replicate</CardTitle>
          <CardDescription>
            Fixed 60 Hz tick, input commands, and snapshots. The battlefield you see is a view of
            the same sim later tickets will network.
          </CardDescription>
        </Card>
      </section>
    </main>
  );
}
