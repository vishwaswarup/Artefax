// Minimal thin-line SVG diagrams illustrating the "naive re-prompting"
// vs. "one shared understanding" comparison on the landing page.
// Hardcoded coordinates — these are small, fixed illustrations, not
// dynamically generated charts.

const OUTPUT_LABELS = ["Summary", "LinkedIn", "Advisory", "Presentation"];

function Box({
  x,
  y,
  width,
  height,
  label,
  fontSize = 8,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fontSize?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  );
}

// Four separate PDF → AI → Output rows, deliberately disconnected from
// each other (the separateness is the point: four independent rolls).
export function NaiveFlowDiagram() {
  const rowY = [8, 48, 88, 128];
  const rowH = 24;

  return (
    <svg
      viewBox="0 0 250 160"
      width="100%"
      style={{ maxWidth: 260 }}
      className="text-neutral-600"
      aria-label="Diagram: four separate PDF to AI to output flows, disconnected from each other"
      role="img"
    >
      <defs>
        <marker
          id="naive-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      {rowY.map((y, i) => {
        const cy = y + rowH / 2;
        return (
          <g key={OUTPUT_LABELS[i]}>
            <Box x={0} y={y} width={34} height={rowH} label="PDF" />
            <line
              x1={34}
              y1={cy}
              x2={68}
              y2={cy}
              stroke="currentColor"
              strokeWidth={1}
              markerEnd="url(#naive-arrow)"
            />
            <Box x={70} y={y} width={28} height={rowH} label="AI" />
            <line
              x1={98}
              y1={cy}
              x2={132}
              y2={cy}
              stroke="currentColor"
              strokeWidth={1}
              markerEnd="url(#naive-arrow)"
            />
            <Box x={134} y={y} width={110} height={rowH} label={OUTPUT_LABELS[i]} />
          </g>
        );
      })}
    </svg>
  );
}

// One PDF → AI → Understanding trunk, branching into the four outputs
// from a single shared node (the single source of truth is the point).
//
// Layout, left to right (each element starts exactly where the previous
// arrow/line ends, so nothing overlaps):
//   PDF [0,34]  --arrow--> AI [70,98]  --arrow--> Understanding [132,202]
//   Understanding's right edge (x=202) is the branch spine's x position.
//   Spine ticks run [202,212] into each output box [212,307].
export function ArtefaxFlowDiagram() {
  const rowY = [10, 50, 90, 130];
  const rowH = 24;
  const spineX = 202;
  const tickEndX = 212;
  const trunkCy = 82;

  return (
    <svg
      viewBox="0 0 325 160"
      width="100%"
      style={{ maxWidth: 320 }}
      className="text-neutral-600"
      aria-label="Diagram: one PDF to AI to shared understanding node, branching into four consistent outputs"
      role="img"
    >
      <defs>
        <marker
          id="artefax-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Trunk: PDF -> AI -> Understanding */}
      <Box x={0} y={trunkCy - 12} width={34} height={24} label="PDF" />
      <line
        x1={34}
        y1={trunkCy}
        x2={68}
        y2={trunkCy}
        stroke="currentColor"
        strokeWidth={1}
        markerEnd="url(#artefax-arrow)"
      />
      <Box x={70} y={trunkCy - 12} width={28} height={24} label="AI" />
      <line
        x1={98}
        y1={trunkCy}
        x2={130}
        y2={trunkCy}
        stroke="currentColor"
        strokeWidth={1}
        markerEnd="url(#artefax-arrow)"
      />
      <Box
        x={132}
        y={trunkCy - 16}
        width={70}
        height={32}
        label="Understanding"
        fontSize={7}
      />

      {/* Branch spine + ticks into each output */}
      <line
        x1={spineX}
        y1={rowY[0] + rowH / 2}
        x2={spineX}
        y2={rowY[3] + rowH / 2}
        stroke="currentColor"
        strokeWidth={1}
      />
      {rowY.map((y, i) => {
        const cy = y + rowH / 2;
        return (
          <g key={OUTPUT_LABELS[i]}>
            <line
              x1={spineX}
              y1={cy}
              x2={tickEndX}
              y2={cy}
              stroke="currentColor"
              strokeWidth={1}
              markerEnd="url(#artefax-arrow)"
            />
            <Box x={tickEndX + 10} y={y} width={95} height={rowH} label={OUTPUT_LABELS[i]} />
          </g>
        );
      })}
    </svg>
  );
}
