import { useEffect, useMemo, useState } from "react";
import { CalcState, DEFAULTS } from "./state";
import {
  buildSchedule,
  compareBuyRent,
  fmtCompact,
  fmtMoney,
  fmtPct,
  fmtYears,
} from "./lib/finance";
import { MortgageSection, SavingsSection } from "./sections/Calculators";
import { RentSection, CompareSection } from "./sections/RentCompare";
import { cx, IconReset, Reveal, useTween } from "./components/ui";

const NAV = [
  { id: "mortgage", num: "01", label: "Ипотека" },
  { id: "savings", num: "02", label: "Накопления" },
  { id: "rent", num: "03", label: "Аренда" },
  { id: "compare", num: "04", label: "Сравнение" },
];

function LogoMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--color-pine-800)" stroke="var(--color-pine-600)" />
      <path d="M8 16 16 8l8 8-8 8z" fill="none" stroke="var(--color-brass-400)" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="2.6" fill="var(--color-mint-400)" />
    </svg>
  );
}

type TickerItem = { k: string; v: string; tone?: string };

export default function App() {
  const [s, setS] = useState<CalcState>(DEFAULTS);
  const [active, setActive] = useState<string>("mortgage");
  const [progress, setProgress] = useState(0);

  const patch = (p: Partial<CalcState>) => setS((prev) => ({ ...prev, ...p }));

  const sched = useMemo(
    () => buildSchedule(s.price, s.down, s.rate, s.years, s.extra, s.type),
    [s.price, s.down, s.rate, s.years, s.extra, s.type]
  );
  const cmp = useMemo(
    () =>
      compareBuyRent({
        price: s.price,
        down: s.down,
        ratePct: s.rate,
        years: s.years,
        extraMonthly: s.extra,
        type: s.type,
        rentMonthly: s.rent.monthly,
        rentIndexPct: s.rent.indexPct,
        depositMonths: s.rent.depositMonths,
        appreciationPct: s.cmp.appreciationPct,
        investRatePct: s.cmp.investRatePct,
        ownerCosts: s.cmp.ownerCosts,
      }),
    [s]
  );

  const paymentAnim = useTween(sched.basePayment);
  const overpayAnim = useTween(sched.totalInterest);
  const deltaAnim = useTween(cmp.delta);
  const buyWins = cmp.delta >= 0;

  /* scrollspy */
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-38% 0px -55% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* scroll progress */
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ticker: TickerItem[] = [
    { k: "ипотечная ставка", v: fmtPct(s.rate) },
    { k: "платёж по ипотеке", v: `${fmtCompact(sched.basePayment)}/мес` },
    { k: "первоначальный взнос", v: fmtCompact(s.down) },
    { k: "аренда аналога", v: `${fmtCompact(s.rent.monthly)}/мес` },
    { k: "индексация аренды", v: fmtPct(s.rent.indexPct) },
    { k: "рост цены жилья", v: fmtPct(s.cmp.appreciationPct) },
    { k: "доходность вложений", v: fmtPct(s.cmp.investRatePct) },
    {
      k: "вердикт модели",
      v: buyWins ? `покупка +${fmtCompact(Math.abs(cmp.delta))}` : `аренда +${fmtCompact(Math.abs(cmp.delta))}`,
      tone: buyWins ? "text-brass-300" : "text-mint-400",
    },
  ];

  return (
    <div className="min-h-screen bg-pine-950 bg-blueprint noise text-mist-100">
      {/* -------- бегущая строка -------- */}
      <div className="border-b border-pine-800 bg-pine-900/90 overflow-hidden relative z-30">
        <div className="ticker-track flex w-max items-center gap-8 py-1.5">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-8" aria-hidden={dup === 1}>
              {ticker.map((t, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-2 font-mono text-[11px] tracking-wide whitespace-nowrap tabular">
                  <span className="w-1.5 h-1.5 rotate-45 bg-brass-400/70 inline-block" />
                  <span className="text-mist-500 uppercase tracking-[0.12em]">{t.k}</span>
                  <b className={cx("font-bold", t.tone ?? "text-mist-100")}>{t.v}</b>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* -------- шапка -------- */}
      <header className="sticky top-0 z-40 border-b border-pine-800/90 bg-pine-950/85 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 h-[64px] flex items-center gap-5">
          <a href="#top" className="flex items-center gap-3 group shrink-0">
            <LogoMark className="w-9 h-9 transition-transform duration-300 group-hover:rotate-90" />
            <span className="leading-none">
              <span className="block font-display font-bold text-[15px] tracking-wide text-mist-50">КВАДРАТУРА</span>
              <span className="block font-mono text-[10px] text-mist-500 tracking-[0.14em] mt-1 uppercase">анализ покупки квартиры</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className={cx(
                  "px-3.5 py-2 rounded-lg font-mono text-[12px] font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5",
                  active === n.id
                    ? "text-brass-300 bg-brass-400/10"
                    : "text-mist-400 hover:text-mist-100 hover:bg-pine-800/70"
                )}
              >
                <span className={cx("text-[10px]", active === n.id ? "text-brass-400" : "text-mist-500")}>{n.num}</span>
                {n.label}
              </a>
            ))}
          </nav>
          <button
            onClick={() => setS(DEFAULTS)}
            className="ml-auto md:ml-0 flex items-center gap-2 px-3.5 py-2 rounded-lg border border-pine-700 text-[12px] font-semibold text-mist-400 hover:text-brass-300 hover:border-brass-400/50 hover:bg-brass-400/5 transition-all duration-200 group"
            title="Вернуть параметры по умолчанию"
          >
            <span className="transition-transform duration-500 group-hover:-rotate-[360deg]">
              <IconReset className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Сброс</span>
          </button>
        </div>
        <div
          className="absolute bottom-[-1px] left-0 h-[2px] bg-gradient-to-r from-brass-500 via-brass-400 to-mint-400 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </header>

      {/* -------- мобильная навигация -------- */}
      <div className="md:hidden sticky top-[64px] z-30 bg-pine-950/90 backdrop-blur border-b border-pine-800/80 overflow-x-auto">
        <div className="flex gap-1.5 px-4 py-2 w-max">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={cx(
                "px-3 py-1.5 rounded-full border font-mono text-[11px] font-semibold whitespace-nowrap transition-colors",
                active === n.id ? "border-brass-400/60 text-brass-300 bg-brass-400/10" : "border-pine-700 text-mist-400"
              )}
            >
              {n.num} · {n.label}
            </a>
          ))}
        </div>
      </div>

      <main id="top" className="max-w-[1240px] mx-auto px-5 md:px-8">
        {/* -------- открывающая доска решений -------- */}
        <section className="pt-12 md:pt-16 pb-12 md:pb-16">
          <div className="grid lg:grid-cols-[7fr_5fr] gap-10 items-center">
            <Reveal>
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-brass-300 border border-brass-400/30 bg-brass-400/8 rounded-full px-3.5 py-1.5 mb-6">
                  <span className="relative flex w-2 h-2">
                    <span className="pulse-dot absolute inline-flex w-full h-full rounded-full bg-mint-400" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-mint-400" />
                  </span>
                  расчёт обновляется вживую
                </p>
                <h1 className="font-display font-black text-[30px] sm:text-[42px] lg:text-[50px] leading-[1.06] text-mist-50">
                  Квадратные метры
                  <br />
                  против <span className="text-brass-300">процентов</span>
                </h1>
                <p className="mt-5 text-mist-400 text-[15px] md:text-base leading-relaxed max-w-xl">
                  Четыре связанных калькулятора: ипотека с графиком платежей, копилка на первый взнос,
                  реальная стоимость аренды за весь срок и честная дуэль «купить или снимать» с точкой
                  окупаемости. Каждая цифра ниже пересчитывается от движения любого ползунка.
                </p>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {NAV.map((n) => (
                    <a
                      key={n.id}
                      href={`#${n.id}`}
                      className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-pine-700 bg-pine-900/60 font-semibold text-[13px] text-mist-300 hover:text-mist-50 hover:border-pine-600 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <span className="font-mono text-[11px] text-brass-400">{n.num}</span>
                      {n.label}
                      <span className="text-mist-500 group-hover:text-brass-300 group-hover:translate-x-0.5 transition-all">→</span>
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-brass-400/10 via-transparent to-mint-400/10 blur-xl pointer-events-none" />
                <div className="relative rounded-2xl border border-pine-700 bg-pine-900/90 overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
                  <div className="px-5 py-3 border-b border-pine-800 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500">сводка по вашим цифрам</span>
                    <span className="flex gap-1.5">
                      <i className="w-2 h-2 rounded-full bg-coral-400/80" />
                      <i className="w-2 h-2 rounded-full bg-brass-400/80" />
                      <i className="w-2 h-2 rounded-full bg-mint-400/80" />
                    </span>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="p-5 border-b border-r border-pine-800">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-mist-500 font-semibold">платёж по ипотеке</p>
                      <p className="mt-1.5 font-mono font-bold text-lg md:text-xl text-brass-300 tabular">{fmtMoney(paymentAnim)}/мес</p>
                    </div>
                    <div className="p-5 border-b border-pine-800">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-mist-500 font-semibold">переплата</p>
                      <p className="mt-1.5 font-mono font-bold text-lg md:text-xl text-coral-400 tabular">{fmtCompact(overpayAnim)}</p>
                    </div>
                    <div className="p-5 border-r border-pine-800">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-mist-500 font-semibold">аренда аналога</p>
                      <p className="mt-1.5 font-mono font-bold text-lg md:text-xl text-mist-100 tabular">{fmtCompact(s.rent.monthly)}/мес</p>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-mist-500 font-semibold">вердикт · {fmtYears(s.years * 12)}</p>
                      <p className={cx("mt-1.5 font-mono font-bold text-lg md:text-xl tabular", buyWins ? "text-mint-400" : "text-brass-300")}>
                        {buyWins ? "покупка" : "аренда"} +{fmtCompact(Math.abs(deltaAnim))}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cx(
                      "px-5 py-3 text-[12px] font-medium border-t flex items-center gap-2",
                      buyWins ? "border-brass-400/25 bg-brass-400/8 text-brass-200" : "border-mint-500/25 bg-mint-500/8 text-mint-300"
                    )}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">itog</span>
                    {buyWins
                      ? "капитал в квартире обгоняет портфель арендатора"
                      : "инвестиции разницы обгоняют капитал в бетоне"}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="space-y-20 md:space-y-28 pb-20">
          <MortgageSection s={s} patch={patch} />
          <SavingsSection s={s} patch={patch} />
          <RentSection s={s} patch={patch} />
          <CompareSection s={s} patch={patch} />
        </div>
      </main>

      {/* -------- подвал -------- */}
      <footer className="border-t border-pine-800 bg-pine-900/70">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-10 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <LogoMark className="w-7 h-7" />
              <span className="font-display font-bold text-sm text-mist-100">КВАДРАТУРА</span>
            </div>
            <p className="text-[13px] text-mist-500 leading-relaxed max-w-xs">
              Инструмент для спокойного разговора с собой перед сделкой. Все расчёты выполняются локально в браузере.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500 mb-3">формулы внутри</p>
            <ul className="space-y-1.5 font-mono text-[12px] text-mist-400 tabular">
              <li>аннуитет: S · i · (1+i)ⁿ / ((1+i)ⁿ − 1)</li>
              <li>вклад: B ← B · (1 + i/12) + взнос</li>
              <li>капитал покупателя: цена · (1+g)ᵗ − долг</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist-500 mb-3">важно</p>
            <p className="text-[12px] text-mist-500 leading-relaxed">
              Модель упрощает реальность: без налогов, страхования сделки, ремонта и инфляции самих доходов.
              Это ориентир для размышления, а не индивидуальная инвестиционная рекомендация.
            </p>
          </div>
        </div>
        <div className="border-t border-pine-800/70">
          <div className="max-w-[1240px] mx-auto px-5 md:px-8 py-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-mist-500">
            <span>© Квадратура · считайте перед тем, как подписывать</span>
            <span>1 м² = 10 000 см² здравого смысла</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
