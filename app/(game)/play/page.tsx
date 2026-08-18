import PlayClient from "./play-client";

export const metadata = {
  title: "Play"
};

export default function PlayPage() {
  return (
    <main className="bg-slate-950" aria-label="Shield Wall battlefield">
      <h1 className="sr-only">Shield Wall battlefield</h1>
      <PlayClient />
    </main>
  );
}
