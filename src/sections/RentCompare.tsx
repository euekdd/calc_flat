import { useMemo, useState } from "react";
import {
  compareBuyRent,
  fmtMoney,
  fmtCompact,
  fmtPct,
  fmtYears,
  plural,
  rentSeries,
} from "../lib/finance";
import { CalcState, SCENARIOS, ScenarioId } from "../state";
import {
  AmountInput,
  Chip,
  Panel,
  Reveal,
  SectionHeading,
  Segmented,
  SliderField,
  Stat,
  useTween,
  IconKey,
  IconScale,
} from "../components/ui";
import { CompareChart } from "../components/charts";

/* ================================= АРЕНДА ================================= */

export function RentSection({
  s,
  patch,
}: {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
}) {
  const r = s.rent;
  const set = (p: Partial<typeof r>) => patch({ rent: { ...r, ...p } });
  const series = useMemo(
    () => rentSeries(r.monthly, r.indexPct, s.years),
    [r.monthly, r.indexPct, s.years]
  );
  const total = useTween(series.totalPaid);
  const [hover, setHover] = useState<number | null>(null);
  const active =
    series.years[Math.min(hover ?? series.years.length - 1, series.years.length - 1)];
  const maxRent = Math.max(...series.years.map((y) => y.yearlyRent));
  const deposit = r.monthly * r.depositMonths;

  return (
    <section id="rent">
      <SectionHeading
        index="03"
        icon={<IconKey className="w-4 h-4" />}
        kicker="аренда"
        title="Сколько вы оставите арендодателю"
        lead="Аренда кажется «лёгкой» только до первого подсчёта: индексация незаметно разгоняет платёж, а на горизонте срока ипотеки набегает сумма, сравнимая со стоимостью квартиры."
      />

      <div className="grid lg:grid-cols-[5fr_7fr] gap-6 items-start">
        <Reveal>
          <Panel className="p-5 md:p-7 space-y-5">
            <AmountInput
              label="Аренда в месяц"
              value={r.monthly}
              min={5_000}
              max={2_000_000}
              onChange={(v) => set({ monthly: v })}
            />
            <SliderField
              label=""
              value={r.monthly}
              min={10_000}
              max={250_000}
              step={5_000}
              onChange={(v) => set({ monthly: v })}
              format={fmtCompact}
            />
            <SliderField
              label="Индексация аренды в год"
              value={r.indexPct}
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => set({ indexPct: Math.round(v * 2) / 2 })}
              format={(v) => fmtPct(v)}
              hint="Обычно аренда растёт вместе с инфляцией"
            />
            <div>
              <label className="block text-[13px] font-medium text-mist-300 tracking-wide mb-1.5">
                Обеспечительный залог
              </label>
              <Segmented
                size="sm"
                value={String(r.depositMonths) as "0" | "1" | "2"}
                onChange={(v) => set({ depositMonths: Number(v) })}
                options={[
                  { label: "Без залога", value: "0" },
                  { label: "1 месяц", value: "1" },
                  { label: "2 месяца", value: "2" },
                ]}
              />
            </div>
            <div className="rounded-xl border border-pine-700 bg-pine-900/60 px-4 py-3 font-mono text-[12px] text-mist-400 tabular leading-relaxed">
              Горизонт расчёта — срок вашей ипотеки:{" "}
              <b className="text-mist-100">
                {s.years} {plural(s.years, "год", "года", "лет")}
              </b>
              {deposit > 0 && (
                <>
                  {" "}· залог {fmtMoney(deposit)} на старте (в расчёте не инвестируется)
                </>
              )}
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={120}>
          <div className="space-y-4">
            <Panel className="p-6 md:p-7 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-coral-400/70 to-transparent" />
              <p className="text-[11px] uppercase tracking-[0.16em] text-mist-500 font-semibold mb-2">
                Отдано за аренду за {s.years} {plural(s.years, "год", "года", "лет")}
              </p>
              <p className="font-display font-bold text-[34px] md:text-[42px] leading-none text-coral-400 tabular">
                {fmtMoney(total)}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat
                  label={`Аренда к ${s.years}-му году`}
                  value={`${fmtCompact(series.finalRent)}/мес`}
                  tone="coral"
                  sub={`рост ×${(series.finalRent / (r.monthly || 1)).toFixed(1)} к старту`}
                />
                <Stat
                  label="Средний платёж"
                  value={`${fmtCompact(series.totalPaid / (s.years * 12))}/мес`}
                  tone="neutral"
                  sub="за весь горизонт"
                />
                <Stat
                  label="Доля от цены квартиры"
                  value={fmtPct((series.totalPaid / (s.price || 1)) * 100, 0)}
                  tone="brass"
                  sub="аренда ÷ стоимость квартиры"
                />
              </div>
            </Panel>

            <Panel className="p-5 md:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
                <h3 className="font-display font-medium text-lg md:text-xl text-mist-50">
                  Арендные платежи по годам
                </h3>
                {active && (
                  <span key={active.year} className="rise-in font-mono text-[12px] text-mist-300 tabular">
                    <b className="text-mist-50">{active.year}-й год:</b> {fmtCompact(active.yearlyRent)}
                    <span className="text-mist-500"> · к концу года {fmtCompact(active.monthRent)}/мес</span>
                  </span>
                )}
              </div>
              <div className="flex items-end gap-[3px] h-40" onMouseLeave={() => setHover(null)}>
                {series.years.map((y, i) => (
                  <div
                    key={y.year}
                    className="relative flex-1 rounded-t-[3px] transition-all duration-200 cursor-crosshair"
                    style={{
                      height: `${Math.max(4, (y.yearlyRent / maxRent) * 100)}%`,
                      background:
                        hover === i
                          ? "var(--color-coral-300)"
                          : `color-mix(in srgb, var(--color-coral-400) ${35 + (y.yearlyRent / maxRent) * 55}%, transparent)`,
                    }}
                    onMouseEnter={() => setHover(i)}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[11px] text-mist-500 tabular">
                <span>1-й год</span>
                <span>{s.years}-й год</span>
              </div>
            </Panel>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================== КУПИТЬ VS СНИМАТЬ ============================== */

export function CompareSection({
  s,
  patch,
}: {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
}) {
  const c = s.cmp;
  const set = (p: Partial<typeof c>) => patch({ cmp: { ...c, ...p } });

  const res = useMemo(
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
        appreciationPct: c.appreciationPct,
        investRatePct: c.investRatePct,
        ownerCosts: c.ownerCosts,
      }),
    [s.price, s.down, s.rate, s.years, s.extra, s.type, s.rent, c.appreciationPct, c.investRatePct, c.ownerCosts]
  );

  const delta = useTween(res.delta);
  const buyWins = res.delta >= 0;
  const be = res.breakeven;
  const beTotalMonths = be ? be.year * 12 + be.month : null;

  return (
    <section id="compare">
      <SectionHeading
        index="04"
        icon={<IconScale className="w-4 h-4" />}
        kicker="решение"
        title="Купить или снимать — честное сравнение"
        lead="Обе стратегии стартуют с одинакового первоначального взноса. Покупатель гасит ипотеку и копит капитал в бетоне, арендатор инвестирует разницу между платежом и арендой. Чей капитал больше в конце?"
      />

      {/* вердикт */}
      <Reveal>
        <Panel className={`sheen p-6 md:p-8 mb-6 relative overflow-hidden ${buyWins ? "border-brass-400/40" : "border-mint-500/40"}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-mist-500 font-semibold mb-2">
                Вердикт на горизонте {fmtYears(s.years * 12)}
              </p>
              <p className={`font-display font-bold text-[26px] md:text-[36px] leading-tight ${buyWins ? "text-brass-300" : "text-mint-400"}`}>
                {buyWins ? "Покупка создаёт больше капитала" : "Аренда и инвестиции выгоднее"}
              </p>
              <p className="mt-3 text-mist-300 text-[14px] leading-relaxed max-w-xl">
                {buyWins ? (
                  <>
                    К финалу нетто-капитал покупателя — квартира за вычетом долга плюс
                    инвестированные освободившиеся платежи — даст на{" "}
                    <b className="font-mono tabular text-brass-300">+{fmtCompact(Math.abs(delta))}</b>{" "}
                    больше, чем портфель арендатора.
                  </>
                ) : (
                  <>
                    К финалу портфель арендатора обгоняет капитал покупателя на{" "}
                    <b className="font-mono tabular text-mint-400">+{fmtCompact(Math.abs(delta))}</b>.
                    Свобода манёвра — бонусом.
                  </>
                )}
              </p>
            </div>
            <div className={`shrink-0 rounded-2xl border px-6 py-5 text-center ${buyWins ? "border-brass-400/30 bg-brass-400/8" : "border-mint-500/30 bg-mint-500/8"}`}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-mist-500 font-semibold mb-1.5">
                Точка окупаемости
              </p>
              {be && beTotalMonths !== null ? (
                beTotalMonths === 0 ? (
                  <p className={`font-display font-bold text-2xl ${buyWins ? "text-brass-300" : "text-mint-400"}`}>сразу</p>
                ) : (
                  <>
                    <p className={`font-display font-bold text-3xl md:text-4xl tabular ${buyWins ? "text-brass-300" : "text-mint-400"}`}>
                      {Math.floor(beTotalMonths / 12) > 0 ? `${Math.floor(beTotalMonths / 12)} г.` : ""} {beTotalMonths % 12 > 0 ? `${beTotalMonths % 12} мес.` : ""}
                    </p>
                    <p className="mt-1 text-[12px] text-mist-500">покупка обгоняет аренду</p>
                  </>
                )
              ) : (
                <>
                  <p className="font-display font-bold text-2xl text-coral-400">не за {s.years} лет</p>
                  <p className="mt-1 text-[12px] text-mist-500">при текущих допущениях</p>
                </>
              )}
            </div>
          </div>
        </Panel>
      </Reveal>

      <div className="grid lg:grid-cols-[5fr_7fr] gap-6 items-start">
        {/* сценарий */}
        <Reveal>
          <Panel className="p-5 md:p-7 space-y-5">
            <div>
              <p className="text-[13px] font-medium text-mist-300 mb-2">Макросценарий</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
                  <Chip key={id} active={c.scenario === id} onClick={() => set({ appreciationPct: SCENARIOS[id].appr, investRatePct: SCENARIOS[id].inv, scenario: id })}>
                    {SCENARIOS[id].label}
                  </Chip>
                ))}
              </div>
              {c.scenario && (
                <p key={c.scenario} className="rise-in mt-2 text-[12px] text-mist-500">
                  {SCENARIOS[c.scenario].note}
                </p>
              )}
            </div>
            <SliderField
              label="Рост стоимости квартиры, % в год"
              value={c.appreciationPct}
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => set({ appreciationPct: Math.round(v * 2) / 2, scenario: null })}
              format={(v) => fmtPct(v)}
            />
            <SliderField
              label="Доходность вложений арендатора, % в год"
              value={c.investRatePct}
              min={0}
              max={25}
              step={0.5}
              onChange={(v) => set({ investRatePct: Math.round(v * 2) / 2, scenario: null })}
              format={(v) => fmtPct(v)}
              hint="Вклады, облигации, фонды ликвидности"
            />
            <SliderField
              label="Расходы собственника, ₽ в месяц"
              value={c.ownerCosts}
              min={0}
              max={40_000}
              step={500}
              onChange={(v) => set({ ownerCosts: v })}
              format={fmtCompact}
              hint="ЖКУ, страховка, мелкий ремонт — у арендатора часть этого уже в аренде"
            />
            <div className="rounded-xl border border-pine-700 bg-pine-900/60 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-mist-500 font-semibold mb-2">Допущения модели</p>
              <ul className="space-y-1.5 text-[12px] text-mist-400 leading-relaxed">
                <li className="flex gap-2"><span className="text-brass-400 font-mono">→</span> обе стороны стартуют со взносом {fmtCompact(s.down)};</li>
                <li className="flex gap-2"><span className="text-brass-400 font-mono">→</span> арендатор ежемесячно инвестирует разницу «ипотечный платёж + ЖКУ − аренда»;</li>
                <li className="flex gap-2"><span className="text-brass-400 font-mono">→</span> после выплаты ипотеки собственник направляет бывшие платежи в тот же портфель;</li>
                <li className="flex gap-2"><span className="text-brass-400 font-mono">→</span> налоги, комиссии и ремонт «под ключ» не учтены — добавьте их в расходы собственника.</li>
              </ul>
            </div>
          </Panel>
        </Reveal>

        {/* график и итоги */}
        <Reveal delay={120}>
          <div className="space-y-4">
            <Panel className="p-5 md:p-7">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                <h3 className="font-display font-medium text-lg md:text-xl text-mist-50">
                  Капитал сторон по годам
                </h3>
                <span className="font-mono text-[12px] text-coral-300 tabular">
                  {be && be.year > 0 ? "пунктир — точка окупаемости" : "наведите — детали года"}
                </span>
              </div>
              <CompareChart points={res.points} breakeven={res.breakeven} />
            </Panel>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <Stat
                label={`Квартира через ${s.years} лет`}
                value={fmtCompact(res.propertyFinal)}
                tone="brass"
                sub={`+${fmtPct((res.propertyFinal / (s.price || 1) - 1) * 100, 0)} к цене покупки`}
              />
              <Stat
                label="Остаток долга"
                value={fmtCompact(res.debtFinal)}
                tone="coral"
                sub={`выплачено банку ${fmtCompact(res.totalMortgagePaid)}`}
              />
              <Stat
                label="Портфель арендатора"
                value={fmtCompact(res.finalRent)}
                tone="mint"
                sub={`арендой отдано ${fmtCompact(res.totalRentPaid)}`}
              />
              <Stat
                label="Расходы собственника"
                value={fmtCompact(res.totalOwnerCosts)}
                tone="neutral"
                sub={`ЖКУ и обслуживание за ${s.years} лет`}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
