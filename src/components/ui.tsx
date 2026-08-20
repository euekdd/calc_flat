import React, { useEffect, useRef, useState } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- анимация чисел ------------------------------- */

export function useTween(target: number, dur = 420): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (Math.abs(from - target) < 1e-9) return;
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = from + (target - from) * e;
      fromRef.current = v;
      setVal(v);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, dur]);

  return val;
}

/* ------------------------------- scroll reveal ------------------------------- */

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* --------------------------------- иконки --------------------------------- */

const svgProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const IconHome = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...svgProps} className={className}>
    <path d="M3.5 10.5 12 3.5l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.5 20v-5.5h5V20" />
  </svg>
);

export const IconCoins = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...svgProps} className={className}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.66 2.69 3 6 3s6-1.34 6-3V7" />
    <path d="M3 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    <path d="M17.5 9.7c2.07.47 3.5 1.48 3.5 2.8v5c0 1.5-1.83 2.75-4.2 2.95" />
  </svg>
);

export const IconKey = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...svgProps} className={className}>
    <circle cx="8" cy="8" r="4.5" />
    <path d="m11.2 11.2 8.3 8.3" />
    <path d="M16 16l2-2M19 19l1.5-1.5" />
  </svg>
);

export const IconScale = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg {...svgProps} className={className}>
    <path d="M12 4v16M7 20h10" />
    <path d="M12 5 5 7m7-2 7 2" />
    <path d="M5 7 2.5 13a3 3 0 0 0 5 0L5 7ZM19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z" />
  </svg>
);

export const IconReset = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg {...svgProps} className={className}>
    <path d="M4 10a8 8 0 1 1 1.7 6.5" />
    <path d="M4 16v-6h6" />
  </svg>
);

/* --------------------------------- поля --------------------------------- */

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hint?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="group">
      {label && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <label className="text-[13px] font-medium text-mist-300 tracking-wide">{label}</label>
          <span className="font-mono text-sm font-bold text-mist-50 tabular transition-colors group-hover:text-brass-300">
            {format(value)}
          </span>
        </div>
      )}
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label || "параметр"}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          "--track": `linear-gradient(90deg, var(--color-brass-500) 0%, var(--color-brass-400) ${pct}%, var(--color-pine-700) ${pct}%)`,
        } as React.CSSProperties}
      />
      {hint && <p className="mt-0.5 text-[11px] text-mist-500 leading-snug">{hint}</p>}
    </div>
  );
}

export function AmountInput({
  label,
  value,
  onChange,
  min = 0,
  max = 1e12,
  suffix = "₽",
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const safe = Number.isFinite(value) ? value : 0;
  const display = focused ? String(Math.round(safe)) : Math.round(safe).toLocaleString("ru-RU");

  return (
    <div>
      <label className="block text-[13px] font-medium text-mist-300 tracking-wide mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-pine-700 bg-pine-900/70 px-3 py-2 focus-within:border-brass-400/70 focus-within:shadow-[0_0_0_3px_rgba(233,177,78,0.12)] transition-all">
        <input
          className="num-input w-full bg-transparent font-mono font-bold text-mist-50 tabular text-base"
          inputMode="numeric"
          value={display}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "");
            const num = digits === "" ? 0 : parseInt(digits, 10);
            onChange(Math.min(max, Math.max(min, num)));
          }}
        />
        <span className="font-mono text-sm text-mist-500 shrink-0">{suffix}</span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-mist-500 leading-snug">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <div
      className="relative grid rounded-lg border border-pine-700 bg-pine-900/80 p-1 select-none"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      role="tablist"
    >
      <div
        className="absolute top-1 bottom-1 rounded-md bg-pine-700 shadow-[inset_0_1px_0_rgba(231,241,234,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.3,0.8,0.3,1)]"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${idx * 100}%)`, left: 4 }}
        aria-hidden
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "relative z-10 font-semibold tracking-wide transition-colors rounded-md",
            size === "sm" ? "text-[12px] py-1.5 px-2" : "text-[13px] py-2 px-3",
            o.value === value ? "text-brass-300" : "text-mist-400 hover:text-mist-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "px-3 py-1.5 rounded-full border text-[12px] font-semibold tracking-wide transition-all duration-200",
        active
          ? "border-brass-400 bg-brass-400/15 text-brass-300 shadow-[0_0_18px_rgba(233,177,78,0.15)]"
          : "border-pine-700 bg-pine-900/60 text-mist-400 hover:text-mist-100 hover:border-pine-600 hover:-translate-y-px"
      )}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "mint" | "coral" | "brass";
}) {
  const toneCls =
    tone === "mint"
      ? "text-mint-400"
      : tone === "coral"
      ? "text-coral-400"
      : tone === "brass"
      ? "text-brass-300"
      : "text-mist-50";
  return (
    <div className="rounded-xl border border-pine-700/80 bg-pine-850/80 px-4 py-3.5 hover:border-pine-600 hover:bg-pine-800/80 transition-all duration-300 group">
      <p className="text-[11px] uppercase tracking-[0.14em] text-mist-500 font-semibold mb-1">
        {label}
      </p>
      <p className={cx("font-mono font-bold tabular leading-tight text-base md:text-lg", toneCls)}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-mist-500 leading-snug">{sub}</p>}
    </div>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-pine-700/70 bg-gradient-to-b from-pine-850 to-pine-900/90 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  index,
  icon,
  kicker,
  title,
  lead,
}: {
  index: string;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  lead: string;
}) {
  return (
    <Reveal>
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[13px] font-bold text-brass-400 tabular">/{index}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-pine-600 to-transparent" />
          <span className="flex items-center gap-2 text-mist-400 text-[12px] font-semibold uppercase tracking-[0.18em]">
            <span className="text-brass-400">{icon}</span>
            {kicker}
          </span>
        </div>
        <h2 className="font-display font-bold text-[26px] md:text-[38px] leading-[1.08] text-mist-50 mb-3">
          {title}
        </h2>
        <p className="text-mist-400 text-[15px] leading-relaxed max-w-2xl">{lead}</p>
      </div>
    </Reveal>
  );
}
