import Link from "next/link";
import Hero from "@/components/Hero";
import ComparisonSection from "@/components/ComparisonSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import PageEffects from "@/components/PageEffects";

const OUTPUTS = [
  {
    name: "Executive Summary",
    desc: "A tight headline, overview, key findings, and recommendations — written for leadership.",
    formats: ["PDF", "TXT"],
  },
  {
    name: "LinkedIn Post",
    desc: "A ready-to-post hook, body, and hashtags, native to how LinkedIn actually reads.",
    formats: ["TXT"],
  },
  {
    name: "Advisory",
    desc: "A formal notice with severity, affected parties, and recommended actions.",
    formats: ["PDF", "TXT"],
  },
  {
    name: "Presentation",
    desc: "A slide-by-slide outline with bullet points and speaker notes, exported as real slides.",
    formats: ["PPTX", "TXT"],
  },
];

export default function LandingPage() {
  return (
    <PageEffects>
    <div className="flex flex-col">
      {/* Nav */}
      <header className="border-b border-neutral-800 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-600 to-transparent" />
        <div className="max-w-5xl mx-auto w-full px-6 py-5 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-neutral-50">
            ARTEFA<span className="text-accent">X</span>
          </span>
          <Link
            href="/app"
            className="cursor-pointer rounded-md bg-accent text-white text-sm font-medium px-4 py-2 shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)] hover:brightness-110 transition-[filter]"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero */}
      <Hero />

      {/* Why not just a chatbot */}
      <ComparisonSection />

      {/* Outputs */}
      <section className="border-t border-neutral-800">
        <div className="max-w-5xl mx-auto w-full px-6 py-16">
          <h2 className="text-xl font-semibold text-neutral-50 mb-8">
            Four outputs, one source of truth
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {OUTPUTS.map((o) => (
              <div
                key={o.name}
                className="border border-neutral-800 rounded-lg p-5 flex flex-col gap-2 transition-colors hover:border-neutral-600"
              >
                <h3 className="font-semibold text-neutral-50">{o.name}</h3>
                <p className="text-sm text-neutral-400">{o.desc}</p>
                <div className="flex gap-1.5 pt-1">
                  {o.formats.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-mono tracking-wider font-medium border border-neutral-700 text-neutral-300 rounded-full px-2 py-0.5"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <HowItWorksSection />

      {/* CTA footer */}
      <section className="border-t border-neutral-800">
        <div className="max-w-5xl mx-auto w-full px-6 py-16 flex flex-col items-start gap-4">
          <h2 className="text-xl font-semibold text-neutral-50">
            Try it with your own document
          </h2>
          <Link
            href="/app"
            className="cursor-pointer rounded-md bg-accent text-white text-sm font-medium px-5 py-2.5 shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)] hover:brightness-110 transition-[filter]"
          >
            Launch App
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-800">
        <div className="max-w-5xl mx-auto w-full px-6 py-8">
          <p className="text-xs text-neutral-500">
            Artefax — Analyze once. Transform many.
          </p>
        </div>
      </footer>
    </div>
    </PageEffects>
  );
}
