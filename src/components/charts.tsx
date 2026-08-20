import React, { useRef, useState } from "react";
import {
  fmtCompact,
  YearRow,
  SavingsYear,
  ComparePoint,
} from "../lib/finance";

const W = 820;
const H = 300;
const PAD_L = 66;
const PAD_R = 18;
const PAD_T = 18;
const PAD_B = 34;
const IW = W - PAD_L - PAD_R;
const IH = H - PAD_T - PAD_B;

const C = {
  grid: "#173f2f",
  axis: "#74937f",
  mint: "#46d695",
  mintDim: "#2b8a62",
  coral: "#f4755c",
  brass: "#e9b14e",
  mist: "#b5ccbe",
};

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const d = v / pow;
  const nice = d <= 1 ? 1 : d <= 2 ? 2 : d <= 2.5 ? 2.5 : d <= 5 ? 5 : 10;
  return nice * pow;
}

function useHoverIndex(count: number, mode: "points" | "bars") {
  const svgRef = useRef<SVGSVGElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = svgRef.current;
    if (!el || count < 1) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let i: number;
    if (mode === "bars") {
      i = Math.floor(((x - PAD_L) / IW) * count);
    } else {
      i = Math.round(((x - PAD_L) / IW) * (count - 1));
    }
    setIdx(Math.max(0, Math.min(count - 1, i)));
  };
  return { svgRef, idx, onMove, onLeave: () => setIdx(null) };
}

function YTicks({ max }: { max: number }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  return (
    <g>
      {ticks.map((t, i) => {
        const y = PAD_T + IH - (t / max) * IH;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={C.grid} strokeWidth={1} strokeDasharray={i === 0 ? "" : "3 5"} />
            <text x={PAD_L - 10} y={y + 4} textAnchor="end" fontSize={11} fill={C.axis} fontFamily="JetBrains Mono, monospace">
              {fmtCompact(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({ labels, positions }: { labels: string[]; positions: number[] }) {
  return (
    <g>
      {labels.map((l, i) => (
        <text key={i} x={positions[i]} y={H - 10} textAnchor="middle" fontSize={11} fill={C.axis} fontFamily="JetBrains Mono, monospace">
          {l}
        </text>
      ))}
    </g>
  );
}

/* ============================ график ипотеки ============================ */

export function MortgageBars({ rows }: { rows: YearRow[] }) {
  const { svgRef, idx, onMove, onLeave } = useHoverIndex(rows.length, "bars");
  const safeIdx = idx !== null && idx < rows.length ? idx : null;
  const active = rows[safeIdx ?? rows.length - 1];
  const max = niceMax(Math.max(...rows.map((r) => r.payment), 1));
  const barW = (IW / rows.length) * 0.62;
  const step = Math.max(1, Math.ceil(rows.length / 10));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 min-h-[22px]">
        <span className="flex items-center gap-2 text-[12px] text-mist-300 font-medium">
          <i className="w-3 h-3 rounded-[3px] inline-block" style={{ background: C.mint }} /> тело кредита
        </span>
        <span className="flex items-center gap-2 text-[12px] text-mist-300 font-medium">
          <i className="w-3 h-3 rounded-[3px] inline-block" style={{ background: C.coral }} /> проценты банку
        </span>
        {active && (
          <span key={active.year} className="rise-in ml-auto font-mono text-[12px] text-mist-300 tabular">
            <b className="text-mist-50">{active.year}-й год:</b> платёж {fmtCompact(active.payment)}
            <span className="text-mint-400"> · тело {fmtCompact(active.principal)}</span>
            <span className="text-coral-400"> · проценты {fmtCompact(active.interest)}</span>
            <span className="text-mist-500"> · остаток {fmtCompact(active.balance)}</span>
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        role="img"
        aria-label="Структура платежей по годам"
      >
        <YTicks max={max} />
        {rows.map((r, i) => {
          const x = PAD_L + (i + 0.5) * (IW / rows.length) - barW / 2;
          const hp = (r.principal / max) * IH;
          const hi = (r.interest / max) * IH;
          const yP = PAD_T + IH - hp;
          const dim = safeIdx !== null && safeIdx !== i;
          return (
            <g key={r.year} opacity={dim ? 0.38 : 1} style={{ transition: "opacity 0.15s" }}>
              <rect x={x} y={yP} width={barW} height={Math.max(hp, 0.5)} fill={C.mint} rx={2} />
              <rect x={x} y={yP - hi} width={barW} height={Math.max(hi, 0.5)} fill={C.coral} rx={2} />
              {safeIdx === i && (
                <rect x={x - 2} y={yP - hi - 2} width={barW + 4} height={hp + hi + 4} fill="none" stroke={C.brass} strokeWidth={1.4} rx={3} />
              )}
            </g>
          );
        })}
        <XLabels
          labels={rows.filter((_, i) => i % step === 0).map((r) => String(r.year))}
          positions={rows.filter((_, i) => i % step === 0).map((r) => PAD_L + (r.year - 0.5) * (IW / rows.length))}
        />
      </svg>
    </div>
  );
}

/* ============================ рост накоплений ============================ */

export function GrowthArea({ rows }: { rows: SavingsYear[] }) {
  const { svgRef, idx, onMove, onLeave } = useHoverIndex(rows.length, "points");
  const safeIdx = idx !== null && idx < rows.length ? idx : null;
  const active = rows[safeIdx ?? rows.length - 1];
  const max = niceMax(Math.max(...rows.map((r) => r.balance), 1));
  const x = (i: number) => PAD_L + (i / (rows.length - 1 || 1)) * IW;
  const y = (v: number) => PAD_T + IH - (v / max) * IH;

  const totalPath = rows.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(r.balance).toFixed(1)}`).join(" ");
  const contribPath = rows.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(r.contributed).toFixed(1)}`).join(" ");
  const areaTotal = `${totalPath} L${x(rows.length - 1)},${PAD_T + IH} L${x(0)},${PAD_T + IH} Z`;
  const areaInterest = `${contribPath} L${x(rows.length - 1)},${y(rows[rows.length - 1].balance).toFixed(1)} ${[...rows]
    .reverse()
    .map((r, i) => `L${x(rows.length - 1 - i).toFixed(1)},${y(r.balance).toFixed(1)}`)
    .join(" ")} Z`;

  const step = Math.max(1, Math.ceil(rows.length / 9));
  const labelIdx = rows.map((_, i) => i).filter((i) => i % step === step - 1 || i === 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 min-h-[22px]">
        <span className="flex items-center gap-2 text-[12px] text-mist-300 font-medium">
          <i className="w-3 h-3 rounded-[3px] inline-block" style={{ background: "#2b6a50" }} /> ваши взносы
        </span>
        <span className="flex items-center gap-2 text-[12px] text-mist-300 font-medium">
          <i className="w-3 h-3 rounded-[3px] inline-block" style={{ background: C.mint }} /> начисленные проценты
        </span>
        {active && (
          <span key={active.year} className="rise-in ml-auto font-mono text-[12px] text-mist-300 tabular">
            <b className="text-mist-50">{active.year}-й год:</b> счёт {fmtCompact(active.balance)}
            <span className="text-mist-500"> · взносы {fmtCompact(active.contributed)}</span>
            <span className="text-mint-400"> · проценты {fmtCompact(active.interest)}</span>
          </span>
        )}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto cursor-crosshair" onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label="Рост накоплений по годам">
        <defs>
          <linearGradient id="gContrib" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b6a50" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#2b6a50" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="gInterest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.mint} stopOpacity="0.55" />
            <stop offset="100%" stopColor={C.mint} stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <YTicks max={max} />
        <path d={areaInterest} fill="url(#gInterest)" />
        <path d={areaTotal} fill="url(#gContrib)" />
        <path d={contribPath} fill="none" stroke={C.mintDim} strokeWidth={1.4} strokeDasharray="4 4" />
        <path d={totalPath} fill="none" stroke={C.mint} strokeWidth={2.4} />
        {safeIdx !== null && (
          <g>
            <line x1={x(safeIdx)} x2={x(safeIdx)} y1={PAD_T} y2={PAD_T + IH} stroke={C.brass} strokeWidth={1} strokeDasharray="3 4" />
            <circle cx={x(safeIdx)} cy={y(rows[safeIdx].balance)} r={5} fill={C.mint} stroke={C.grid} strokeWidth={2} />
            <circle cx={x(safeIdx)} cy={y(rows[safeIdx].contributed)} r={4} fill={C.mintDim} stroke={C.grid} strokeWidth={2} />
          </g>
        )}
        <XLabels
          labels={labelIdx.map((i) => String(rows[i].year))}
          positions={labelIdx.map((i) => x(i))}
        />
      </svg>
    </div>
  );
}

/* ========================= купить vs снимать ========================= */

export function CompareChart({
  points,
  breakeven,
}: {
  points: ComparePoint[];
  breakeven: { year: number; month: number } | null;
}) {
  const { svgRef, idx, onMove, onLeave } = useHoverIndex(points.length, "points");
  const safeIdx = idx !== null && idx < points.length ? idx : null;
  const active = points[safeIdx ?? points.length - 1];
  const max = niceMax(Math.max(...points.map((p) => Math.max(p.buyNet, p.rentNet)), 1));
  const x = (year: number) => PAD_L + (year / (points[points.length - 1].year || 1)) * IW;
  const y = (v: number) => PAD_T + IH - (Math.max(0, v) / max) * IH;

  const buyPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.buyNet).toFixed(1)}`).join(" ");
  const rentPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year).toFixed(1)},${y(p.rentNet).toFixed(1)}`).join(" ");
  const buyArea = `${buyPath} L${x(points[points.length - 1].year)},${PAD_T + IH} L${x(0)},${PAD_T + IH} Z`;
  const rentArea = `${rentPath} L${x(points[points.length - 1].year)},${PAD_T + IH} L${x(0)},${PAD_T + IH} Z`;

  const be =
    breakeven && breakeven.year > 0
      ? {
          t: breakeven.year + breakeven.month / 12,
          v:
            points[breakeven.year].buyNet +
            (points[Math.min(breakeven.year + 1, points.length - 1)].buyNet - points[breakeven.year].buyNet) *
              (breakeven.month / 12),
        }
      : breakeven && breakeven.year === 0
      ? { t: 0.02, v: points[0].buyNet }
      : null;

  const step = Math.max(1, Math.ceil(points.length / 9));
  const delta = active.buyNet - active.rentNet;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 min-h-[22px]">
        <span className="flex items-center gap-2 text-[12px] text-mist-300 font-medium">
          <i className="w-3 h-3 rounded-full inline-block" style={{ background: C.brass }} /> купить: нетто-капитал
        </span>
        <span className="flex items-center gap-2 text-[12px] text-mist-300 font-medium">
          <i className="w-3 h-3 rounded-full inline-block" style={{ background: C.mint }} /> снимать: инвестиции разницы
        </span>
        {active && (
          <span key={active.year} className="rise-in ml-auto font-mono text-[12px] text-mist-300 tabular">
            <b className="text-mist-50">
              {active.year === 0 ? "старт" : `${active.year} ${active.year === 1 ? "год" : active.year < 5 ? "года" : "лет"}`}:
            </b>{" "}
            <span className="text-brass-300">{fmtCompact(active.buyNet)}</span>
            <span className="text-mist-500"> против </span>
            <span className="text-mint-400">{fmtCompact(active.rentNet)}</span>
            <span className={delta >= 0 ? "text-brass-300" : "text-coral-400"}>
              {" "}· Δ {delta >= 0 ? "+" : "−"}{fmtCompact(Math.abs(delta)).replace("−", "")}
            </span>
          </span>
        )}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto cursor-crosshair" onMouseMove={onMove} onMouseLeave={onLeave} role="img" aria-label="Сравнение капитала: покупка против аренды">
        <defs>
          <linearGradient id="gBuy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.brass} stopOpacity="0.3" />
            <stop offset="100%" stopColor={C.brass} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gRent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.mint} stopOpacity="0.22" />
            <stop offset="100%" stopColor={C.mint} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <YTicks max={max} />
        <path d={rentArea} fill="url(#gRent)" />
        <path d={buyArea} fill="url(#gBuy)" />
        <path d={rentPath} fill="none" stroke={C.mint} strokeWidth={2.4} />
        <path d={buyPath} fill="none" stroke={C.brass} strokeWidth={2.4} />
        {be && (
          <g>
            <line x1={x(be.t)} x2={x(be.t)} y1={PAD_T + 6} y2={PAD_T + IH} stroke={C.coral} strokeWidth={1.2} strokeDasharray="4 5" />
            <circle className="pulse-dot" cx={x(be.t)} cy={y(be.v)} r={9} fill={C.coral} opacity={0.35} />
            <circle cx={x(be.t)} cy={y(be.v)} r={5} fill={C.coral} stroke="#0a1c15" strokeWidth={2} />
          </g>
        )}
        {safeIdx !== null && (
          <g>
            <line x1={x(points[safeIdx].year)} x2={x(points[safeIdx].year)} y1={PAD_T} y2={PAD_T + IH} stroke={C.mist} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
            <circle cx={x(points[safeIdx].year)} cy={y(points[safeIdx].buyNet)} r={5} fill={C.brass} stroke="#0a1c15" strokeWidth={2} />
            <circle cx={x(points[safeIdx].year)} cy={y(points[safeIdx].rentNet)} r={5} fill={C.mint} stroke="#0a1c15" strokeWidth={2} />
          </g>
        )}
        <XLabels
          labels={points.filter((_, i) => i % step === 0 || i === points.length - 1).map((p) => (p.year === 0 ? "0" : String(p.year)))}
          positions={points.filter((_, i) => i % step === 0 || i === points.length - 1).map((p) => x(p.year))}
        />
      </svg>
    </div>
  );
}
