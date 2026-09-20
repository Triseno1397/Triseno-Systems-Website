import type { DiagramKind } from "./content";

/**
 * Tiny live micro-diagrams, one per capability. Pure SVG + CSS (ai.css,
 * `.ai-dg*`): only transform, opacity and clip-path animate. Every diagram's
 * un-animated state is its finished state, so reduced motion reads correctly.
 * White hairlines = structure, cyan = the part that is running.
 */

const LANES = [
  { y: 22, label: "RESEARCH", dur: 2.6, delay: 0 },
  { y: 57, label: "ANALYSIS", dur: 2.2, delay: 0.3 },
  { y: 92, label: "GENERATION", dur: 2.9, delay: 0.15 },
  { y: 127, label: "VALIDATION", dur: 2.4, delay: 0.5 },
];

function Orchestration() {
  return (
    <svg className="ai-dg ai-dg--wide" viewBox="0 0 360 150" role="img" aria-label="One orchestrator fanning work out to four parallel agents">
      <path className="ai-dg__hot-stroke" d="M18 85 L30 64 L42 85 Z" />
      <path className="ai-dg__line" d="M42 75 H70 M70 22 V127 M290 22 V127 M290 75 H322" />
      <path className="ai-dg__hot-fill" d="M322 68 L334 75 L322 82 Z" />
      {LANES.map((lane) => (
        <g key={lane.label}>
          <path className="ai-dg__line" d={`M70 ${lane.y} H290`} />
          <text className="ai-dg__text" x="80" y={lane.y - 7}>
            {lane.label}
          </text>
          <rect
            className="ai-dg__hot-fill ai-dg-run"
            x="172"
            y={lane.y - 2}
            width="16"
            height="4"
            style={{ animationDuration: `${lane.dur}s`, animationDelay: `${lane.delay}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

const MATCH_SETS = [
  [
    [1, 0],
    [4, 1],
    [6, 1],
    [8, 3],
  ],
  [
    [0, 2],
    [3, 2],
    [5, 0],
    [9, 1],
  ],
  [
    [2, 3],
    [4, 2],
    [7, 0],
    [7, 3],
  ],
];

function Catalog() {
  const cell = (c: number, r: number): [number, number] => [24 + c * 21.5, 20 + r * 23.5];
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) cells.push(cell(c, r));
  return (
    <svg className="ai-dg" viewBox="0 0 240 110" role="img" aria-label="A product grid where compatible items are linked">
      {cells.map(([x, y], i) => (
        <path key={i} className="ai-dg__line" d={`M${x - 3} ${y} H${x + 3} M${x} ${y - 3} V${y + 3}`} />
      ))}
      {MATCH_SETS.map((set, s) => {
        const pts = set.map(([c, r]) => cell(c, r));
        return (
          <g key={s} className="ai-dg-set" data-first={s === 0 ? "" : undefined} style={{ animationDelay: `${s * 2}s` }}>
            <path className="ai-dg__hot-stroke" d={pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ")} />
            {pts.map(([x, y], i) => (
              <path key={i} className="ai-dg__hot-fill" d={`M${x} ${y - 5} L${x + 4.5} ${y + 3} L${x - 4.5} ${y + 3} Z`} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Compression() {
  return (
    <svg className="ai-dg" viewBox="0 0 240 110" role="img" aria-label="Twelve steps compressing into two layers">
      <g className="ai-dg-squeeze">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} className="ai-dg__line" d={`M${21 + i * 18} 30 V80`} />
        ))}
      </g>
      <g className="ai-dg-layers">
        <path className="ai-dg__hot-stroke" d="M88 44 H152 M88 66 H152" />
        <path className="ai-dg__hot-fill" d="M120 38 L125 47 L115 47 Z" />
      </g>
      <text className="ai-dg__text" x="21" y="100">
        12 STEPS
      </text>
      <text className="ai-dg__text ai-dg__text--hot" x="219" y="100" textAnchor="end">
        02 LAYERS
      </text>
    </svg>
  );
}

const STAGES = [
  { w: 196, label: "LEAD" },
  { w: 150, label: "QUALIFIED" },
  { w: 104, label: "PIPELINE" },
  { w: 66, label: "WON" },
];

function Revenue() {
  return (
    <svg className="ai-dg" viewBox="0 0 240 110" role="img" aria-label="A four-stage revenue funnel with each stage filling">
      {STAGES.map((s, i) => (
        <g key={s.label}>
          <rect className="ai-dg__line" x="20" y={12 + i * 24} width={s.w} height="10" />
          <rect
            className="ai-dg__hot-fill ai-dg-fill"
            x="20"
            y={12 + i * 24}
            width={s.w}
            height="10"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
          <text className="ai-dg__text" x={28 + s.w} y={20.5 + i * 24}>
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const SOURCES = ["CAM", "VTR", "GFX", "REMOTE"];

function Broadcast() {
  return (
    <svg className="ai-dg ai-dg--wide" viewBox="0 0 360 110" role="img" aria-label="Four sources routed through a switcher to one program output">
      <path className="ai-dg__line" d="M170 14 V96" />
      {SOURCES.map((label, i) => {
        const y = 18 + i * 25;
        return (
          <g key={label}>
            <text className="ai-dg__text" x="20" y={y + 3}>
              {label}
            </text>
            <path className="ai-dg__line" d={`M66 ${y} H170`} />
            <g className="ai-dg-set ai-dg-set--4" data-first={i === 0 ? "" : undefined} style={{ animationDelay: `${i * 2}s` }}>
              <path className="ai-dg__hot-stroke" d={`M66 ${y} H170 V55`} />
              <path className="ai-dg__hot-fill" d={`M170 ${y - 5} L175 ${y + 4} L165 ${y + 4} Z`} />
            </g>
          </g>
        );
      })}
      <path className="ai-dg__hot-stroke" d="M170 55 H318" />
      <path className="ai-dg__hot-fill" d="M318 49 L329 55 L318 61 Z" />
      <text className="ai-dg__text ai-dg__text--hot" x="186" y="46">
        PROGRAM OUT
      </text>
      <text className="ai-dg__text" x="186" y="72">
        ROUTED IN REAL TIME
      </text>
    </svg>
  );
}

function Retainer() {
  const bars = Array.from({ length: 12 }, (_, i) => Math.round(9 * Math.pow(1.19, i)));
  return (
    <svg className="ai-dg" viewBox="0 0 240 110" role="img" aria-label="Twelve monthly bars, each taller than the last">
      <path className="ai-dg__line" d="M20 90 H220" />
      {bars.map((h, i) => (
        <rect
          key={i}
          className={i === 11 ? "ai-dg__hot-fill ai-dg-rise" : "ai-dg__line ai-dg-rise"}
          x={24 + i * 16.8}
          y={90 - h}
          width="9"
          height={h}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      <text className="ai-dg__text" x="24" y="104">
        M01
      </text>
      <text className="ai-dg__text ai-dg__text--hot" x="218" y="104" textAnchor="end">
        M12
      </text>
    </svg>
  );
}

function Web() {
  return (
    <svg className="ai-dg" viewBox="0 0 240 110" role="img" aria-label="A page wireframe assembling block by block">
      <rect className="ai-dg__line" x="20" y="8" width="200" height="94" />
      <path className="ai-dg__line" d="M20 22 H220" />
      <g className="ai-dg-wipe" style={{ animationDelay: "0s" }}>
        <rect className="ai-dg__line" x="32" y="32" width="112" height="36" />
        <rect className="ai-dg__hot-fill" x="40" y="54" width="34" height="7" />
      </g>
      <g className="ai-dg-wipe" style={{ animationDelay: "0.5s" }}>
        <rect className="ai-dg__line" x="154" y="32" width="54" height="36" />
      </g>
      <g className="ai-dg-wipe" style={{ animationDelay: "1s" }}>
        <rect className="ai-dg__line" x="32" y="78" width="52" height="14" />
        <rect className="ai-dg__line" x="94" y="78" width="52" height="14" />
        <rect className="ai-dg__line" x="156" y="78" width="52" height="14" />
      </g>
    </svg>
  );
}

export default function CapabilityDiagram({ kind }: { kind: DiagramKind }) {
  switch (kind) {
    case "orchestration":
      return <Orchestration />;
    case "catalog":
      return <Catalog />;
    case "compression":
      return <Compression />;
    case "revenue":
      return <Revenue />;
    case "broadcast":
      return <Broadcast />;
    case "retainer":
      return <Retainer />;
    case "web":
      return <Web />;
  }
}
