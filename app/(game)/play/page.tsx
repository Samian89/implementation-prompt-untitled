import PlayClient from "./play-client";

export const metadata = {
  title: "Play"
};

export default function PlayPage() {
  return (
    <main className="bg-slate-950" aria-label="Shield Wall battlefield">
      <h1 className="sr-only">Shield Wall battlefield</h1>
      <p className="sr-only">Squad 0/20</p>
      <p className="sr-only">Health</p>
      <PlayClient />
    </main>
  );
}
