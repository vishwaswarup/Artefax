"use client";

import { type CSSProperties, type MouseEvent, type ReactNode, useState } from "react";

// Tiny tiling noise pattern (feTurbulence -> desaturated), inlined as an
// SVG data URI. Pure CSS/SVG, no image asset, no dependency.
const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='saturate' values='0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`
);

const GRID_LINES = (opacity: number) =>
  `linear-gradient(to right, rgba(255,255,255,${opacity}) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,${opacity}) 1px, transparent 1px)`;

// Same cursor-spotlight device as the hero, but page-wide and fainter —
// makes the hero read as the strongest instance of one consistent
// design language rather than a one-off flourish. The overlay is
// `fixed` (viewport-anchored), so the mask position is set from raw
// clientX/clientY rather than a scrolling ancestor's bounding rect.
export default function PageEffects({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty("--page-x", `${e.clientX}px`);
    e.currentTarget.style.setProperty("--page-y", `${e.clientY}px`);
  }

  return (
    <>
      {/* A1: fixed, static film-grain texture behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "120px 120px",
        }}
      />

      {/* A2: page-wide cursor-following grid spotlight, fainter than hero's */}
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ "--page-x": "50%", "--page-y": "50%" } as CSSProperties}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            backgroundImage: GRID_LINES(0.05),
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(circle 300px at var(--page-x) var(--page-y), black 0%, rgba(0,0,0,0.5) 55%, transparent 90%)",
            WebkitMaskImage:
              "radial-gradient(circle 300px at var(--page-x) var(--page-y), black 0%, rgba(0,0,0,0.5) 55%, transparent 90%)",
          }}
        />
        <div className="relative z-10">{children}</div>
      </div>
    </>
  );
}
