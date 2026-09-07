import Link from "next/link";

// The cursor-spotlight grid effect lives page-wide in PageEffects now —
// this section no longer renders its own local copy, to avoid two
// overlapping grid layers under the same cursor position.
export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative max-w-5xl mx-auto w-full px-6 pt-20 pb-16">
        <div className="border border-white/10 rounded-lg bg-white/[0.02] p-8 sm:p-10 flex flex-col items-start gap-6 max-w-2xl">
          <span className="text-xs font-mono tracking-wider uppercase text-neutral-400">
            Analyze once. Transform many.
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-50">
            One document. One understanding. Every audience covered.
          </h1>
          <p className="text-base sm:text-lg text-neutral-400 max-w-xl">
            Upload a source document and Artefax builds a single, validated
            understanding of it — then generates an Executive Summary,
            LinkedIn Post, Advisory, and Presentation from that same
            understanding, each exported as a real, downloadable file.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/app"
              className="cursor-pointer rounded-md bg-accent text-white text-sm font-medium px-5 py-2.5 shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)] hover:brightness-110 transition-[filter]"
            >
              Launch App
            </Link>
            <a
              href="#how-it-works"
              className="cursor-pointer rounded-md border border-neutral-700 text-neutral-200 text-sm font-medium px-5 py-2.5 hover:border-accent hover:text-neutral-50 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
