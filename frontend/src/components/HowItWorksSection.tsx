"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: 1,
    title: "Upload a document",
    desc: "Drop in a PDF or paste raw text — a report, a brief, anything with substance.",
  },
  {
    n: 2,
    title: "Analyze once",
    desc: "One pass builds a single, structured understanding: title, summary, topics, entities, key points, claims.",
  },
  {
    n: 3,
    title: "Choose your outputs",
    desc: "Pick which formats you need and set the audience, tone, and detail level.",
  },
  {
    n: 4,
    title: "Transform many",
    desc: "Every output is generated from that same understanding, then downloaded as a real file.",
  },
];

// Same reveal pattern as ComparisonSection: one IntersectionObserver on
// the section, disconnected after the first trigger so it never
// replays. Each step gets an incremental transitionDelay so they
// cascade in left-to-right rather than all appearing at once.
export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="border-t border-neutral-800"
    >
      <div className="max-w-5xl mx-auto w-full px-6 py-16">
        <h2 className="text-xl font-semibold text-neutral-50 mb-8">
          How it works
        </h2>
        <div className="grid sm:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative flex flex-col gap-2 transition-all duration-500 ease-out"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${i * 130}ms`,
              }}
            >
              <span
                aria-hidden="true"
                className="hidden sm:block pointer-events-none select-none absolute -top-10 -left-1 text-[100px] font-normal leading-none font-mono"
                style={{
                  color: "transparent",
                  WebkitTextStroke: "1px rgba(255,255,255,0.03)",
                }}
              >
                {String(s.n).padStart(2, "0")}
              </span>
              <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-xs font-mono tracking-wider font-semibold">
                {String(s.n).padStart(2, "0")}
              </span>
              <h3 className="relative font-medium text-sm text-neutral-50">
                {s.title}
              </h3>
              <p className="relative text-sm text-neutral-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
