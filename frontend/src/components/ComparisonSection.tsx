"use client";

import { useEffect, useRef, useState } from "react";
import { ArtefaxFlowDiagram, NaiveFlowDiagram } from "./FlowDiagrams";

// Scroll-triggered reveal: both columns start faded + shifted down, and
// animate to their resting state once the section enters the viewport.
// Triggers once per page load — the observer disconnects after the
// first intersection, so scrolling back up and down doesn't re-animate.
export default function ComparisonSection() {
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

  const columnBase = "transition-all duration-500 ease-out";
  const columnState = revealed
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-[15px]";
  const cardClass =
    "border border-neutral-800 rounded-lg bg-white/[0.02] p-6";

  return (
    <section ref={sectionRef} className="border-t border-neutral-800">
      <div className="max-w-5xl mx-auto w-full px-6 py-16 grid sm:grid-cols-2 gap-10">
        <div className={`${cardClass} ${columnBase} ${columnState}`}>
          <h2 className="text-xl font-semibold text-neutral-50">
            Why not just ask a chatbot four times?
          </h2>
          <p className="text-sm text-neutral-400 mt-3">
            Re-prompting a model separately for each output means each
            one is its own independent roll against the source text —
            facts, numbers, and framing can quietly drift between them.
          </p>
          <div className="mt-6">
            <NaiveFlowDiagram />
          </div>
        </div>
        <div
          className={`${cardClass} ${columnBase} ${columnState} delay-150`}
        >
          <h2 className="text-xl font-semibold text-neutral-50">
            One structured understanding, reused everywhere
          </h2>
          <p className="text-sm text-neutral-400 mt-3">
            Artefax extracts a validated, typed understanding of the
            document a single time. Every output reads from that same
            structure, so the facts can&rsquo;t disagree with each other.
          </p>
          <div className="mt-6">
            <ArtefaxFlowDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}
