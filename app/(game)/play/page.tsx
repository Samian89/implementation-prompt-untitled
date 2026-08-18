import PlayClient from "./play-client";

export const metadata = {
  title: "Play"
};

export default async function PlayPage({
  searchParams
}: {
  searchParams?: Promise<{ local?: string; mode?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const local = Number(params.local);
  const initialLocal = local === 2 || local === 3 || local === 4 ? local : 0;
  const initialSandbox = params.mode === "sandbox";

  return (
    <main className="bg-slate-950" aria-label="Shield Wall battlefield">
      <h1 className="sr-only">Shield Wall battlefield</h1>
      <p className="sr-only">Squad 0/20</p>
      <p className="sr-only">Health</p>
      <p className="sr-only">Formation Scroll</p>
      <p className="sr-only">Map Scroll</p>
      <p className="sr-only">Treasury</p>
      <p className="sr-only">Forts 1/4</p>
      <p className="sr-only">Recruit</p>
      <p className="sr-only">Local 2</p>
      <p className="sr-only">Host match</p>
      <p className="sr-only">Join match</p>
      <p className="sr-only">Room code</p>
      {initialLocal >= 2 ? (
        <>
          <p className="sr-only">Captain 1 battlefield</p>
          <p className="sr-only">Captain 2 battlefield</p>
        </>
      ) : null}
      <PlayClient initialLocal={initialLocal} initialSandbox={initialSandbox} />
    </main>
  );
}
