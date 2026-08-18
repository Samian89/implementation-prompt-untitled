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
            Four-fort domination
          </p>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Shield Wall</h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Command a Captain against three AI kings. Recruit a squad, march the field, and capture
            the four corner forts. Own them all for Victory — lose the map, and it is Defeat.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild variant="brand" size="lg">
              <Link href="/play">Enter the field</Link>
            </Button>
            <p className="text-sm text-slate-400">Recruit · March · Capture · Win</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-16 md:grid-cols-3">
        <Card>
          <CardTitle>Recruit</CardTitle>
          <CardDescription>
            Spend your treasury on swordsmen, archers, walls, and gates. AI kings spend theirs too —
            then the match goes live.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>March</CardTitle>
          <CardDescription>
            Lead the squad from your courtyard. Hold the home fort or sortie toward the next banner
            across hill, river, and forest.
          </CardDescription>
        </Card>
        <Card>
          <CardTitle>Capture</CardTitle>
          <CardDescription>
            Take a courtyard and the fort is yours. When one team owns all four forts, the field
            ends in Victory or Defeat.
          </CardDescription>
        </Card>
      </section>
    </main>
  );
}
