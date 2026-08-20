import { useMemo } from "react";
import {
  buildSchedule,
  fmtMoney,
  fmtCompact,
  fmtPct,
  fmtYears,
  plural,
  savingsSeries,
  monthsToGoal,
} from "../lib/finance";
import { CalcState } from "../state";
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
  IconHome,
  IconCoins,
} from "../components/ui";
import { MortgageBars, GrowthArea } from "../components/charts";

/* ================================ ИПОТЕКА ================================ */

export function MortgageSection({
  s,
  patch,
}: {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
}) {
  const sched = useMemo(
    () => buildSchedule(s.price, s.down, s.rate, s.years, s.extra, s.type),
    [s.price, s.down, s.rate, s.years, s.extra, s.type]
  );
  const schedNoExtra = useMemo(
    () => buildSchedule(s.price, s.down, s.rate, s.years, 0, s.type),
    [s.price, s.down, s.rate, s.years, s.type]
  );

  const payment = useTween(sched.basePayment);
  const overpay = useTween(sched.totalInterest);
  const downPct = s.price > 0 ? (s.down / s.price) * 100 : 0;
  const savedInterest = schedNoExtra.totalInterest - sched.totalInterest;
  const savedMonths = schedNoExtra.months - sched.months;

  return (
    <section id="mortgage">
      <SectionHeading
        index="01"
        icon={<IconHome className="w-4 h-4" />}
        kicker="ипотека"
        title="Сколько стоит ваша квартира в кредит"
        lead="Крутите стоимость, взнос, ставку и срок — платёж и переплата пересчитываются мгновенно. Доплата сверх графика показывает, сколько лет и процентов вы экономите."
      />

      <div className="grid lg:grid-cols-[7fr_5fr] gap-6 items-start">
        {/* -------- ввод -------- */}
        <Reveal>
          <Panel className="p-5 md:p-7 space-y-6">
            <AmountInput
              label="Стоимость квартиры"
              value={s.price}
              min={500_000}
              max={120_000_000}
              onChange={(v) => {
                const price = Math.max(500_000, v);
                patch({ price, down: Math.min(s.down, price - 100_000) });
              }}
            />
            <SliderField
              label=""
              value={s.price}
              min={1_000_000}
              max={40_000_000}
              step={100_000}
              onChange={(v) => patch({ price: v, down: Math.min(s.down, v - 100_000) })}
              format={fmtCompact}
              hint="Диапазон слайдера 1–40 млн ₽ — точную сумму вбейте в поле выше"
            />

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-mist-300">Первоначальный взнос</span>
              <span className="font-mono text-[12px] font-bold text-brass-300 tabular bg-brass-400/10 border border-brass-400/25 rounded-full px-2.5 py-0.5">
                {fmtPct(downPct, 0)} от цены
              </span>
            </div>
            <div className="-mt-4">
              <AmountInput
                label="Сумма взноса"
                value={s.down}
                min={0}
                max={Math.max(0, s.price - 100_000)}
                onChange={(v) => patch({ down: Math.min(v, s.price - 100_000) })}
              />
            </div>
            <SliderField
              label=""
              value={s.down}
              min={0}
              max={Math.max(0, s.price - 100_000)}
              step={50_000}
              onChange={(v) => patch({ down: v })}
              format={fmtCompact}
            />

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[13px] font-medium text-mist-300">Программы и ставка</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Chip active={s.rate === 6} onClick={() => patch({ rate: 6 })}>Семейная · 6%</Chip>
                <Chip active={s.rate === 19} onClick={() => patch({ rate: 19 })}>Рыночная · 19%</Chip>
                <Chip active={s.rate === 23} onClick={() => patch({ rate: 23 })}>Высокая · 23%</Chip>
              </div>
            </div>
            <SliderField
              label="Годовая ставка"
              value={s.rate}
              min={0.5}
              max={30}
              step={0.1}
              onChange={(v) => patch({ rate: Math.round(v * 10) / 10 })}
              format={(v) => fmtPct(v)}
            />
            <SliderField
              label="Срок кредита"
              value={s.years}
              min={1}
              max={30}
              step={1}
              onChange={(v) => patch({ years: v })}
              format={(v) => `${v} ${plural(v, "год", "года", "лет")}`}
            />
            <div>
              <label className="block text-[13px] font-medium text-mist-300 tracking-wide mb-1.5">
                Схема платежа
              </label>
              <Segmented
                value={s.type}
                onChange={(v) => patch({ type: v })}
                options={[
                  { label: "Аннуитетная", value: "annuity" },
                  { label: "Дифференцированная", value: "diff" },
                ]}
              />
            </div>
            <SliderField
              label="Досрочная доплата к платежу"
              value={s.extra}
              min={0}
              max={150_000}
              step={1_000}
              onChange={(v) => patch({ extra: v })}
              format={fmtCompact}
              hint="Ежемесячно сверх графика, в счёт тела долга"
            />
          </Panel>
        </Reveal>

        {/* -------- результат -------- */}
        <Reveal delay={120}>
          <div className="lg:sticky lg:top-24 space-y-4">
            <Panel className="p-6 md:p-7 overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass-400/70 to-transparent" />
              <p className="text-[11px] uppercase tracking-[0.16em] text-mist-500 font-semibold mb-2">
                {s.type === "annuity" ? "Ежемесячный платёж" : "Первый платёж (далее снижается)"}
              </p>
              <p className="font-display font-bold text-[34px] md:text-[42px] leading-none text-brass-300 tabular">
                {fmtMoney(payment)}
              </p>
              {s.type === "diff" && (
                <p className="mt-2 font-mono text-[13px] text-mist-400 tabular">
                  последний платёж — {fmtMoney(sched.lastPayment)}
                </p>
              )}
              <div className="mt-5 h-2.5 rounded-full bg-pine-900 overflow-hidden flex">
                <div
                  className="h-full bg-mint-400 transition-all duration-500"
                  style={{ width: `${(sched.credit / (sched.totalPaid || 1)) * 100}%` }}
                  title="Тело кредита"
                />
                <div
                  className="h-full bg-coral-400 transition-all duration-500"
                  style={{ width: `${(sched.totalInterest / (sched.totalPaid || 1)) * 100}%` }}
                  title="Проценты"
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-mono text-mist-500 tabular">
                <span><i className="inline-block w-2 h-2 rounded-full bg-mint-400 mr-1.5" />тело {fmtPct((sched.credit / (sched.totalPaid || 1)) * 100, 0)}</span>
                <span><i className="inline-block w-2 h-2 rounded-full bg-coral-400 mr-1.5" />проценты {fmtPct((sched.totalInterest / (sched.totalPaid || 1)) * 100, 0)}</span>
              </div>
            </Panel>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Переплата" value={fmtCompact(overpay)} tone="coral" sub={`${fmtPct((sched.totalInterest / (sched.credit || 1)) * 100, 0)} от суммы кредита`} />
              <Stat label="Всего выплатите" value={fmtCompact(sched.totalPaid)} tone="neutral" sub={`за ${fmtYears(sched.months)}`} />
              <Stat label="Сумма кредита" value={fmtCompact(sched.credit)} tone="neutral" sub={`при взносе ${fmtCompact(s.down)}`} />
              <Stat
                label={s.extra > 0 ? "Эффект досрочки" : "Цена 1 ₽ долга"}
                value={
                  s.extra > 0
                    ? `+${fmtCompact(savedInterest)}`
                    : fmtMoney(sched.totalPaid / (sched.credit || 1), 2)
                }
                tone={s.extra > 0 ? "mint" : "brass"}
                sub={
                  s.extra > 0
                    ? `экономия процентов, срок −${fmtYears(Math.max(0, savedMonths))}`
                    : "итоговая выплата на каждый заёмный рубль"
                }
              />
            </div>
          </div>
        </Reveal>
      </div>

      {/* -------- график и таблица -------- */}
      <Reveal>
        <Panel className="mt-6 p-5 md:p-7">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <h3 className="font-display font-medium text-lg md:text-xl text-mist-50">
              Структура платежей по годам
            </h3>
            <span className="font-mono text-[12px] text-mist-500 tabular">
              наведите на столбец — детали года
            </span>
          </div>
          <MortgageBars rows={sched.years} />
        </Panel>
      </Reveal>

      <Reveal>
        <Panel className="mt-6 overflow-hidden">
          <div className="px-5 md:px-7 pt-5 pb-3 flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="font-display font-medium text-lg md:text-xl text-mist-50">
              График по годам
            </h3>
            <span className="font-mono text-[12px] text-mist-500 tabular">
              {sched.years.length} {plural(sched.years.length, "строка", "строки", "строк")}
            </span>
          </div>
          <div className="max-h-[340px] overflow-auto">
            <table className="w-full text-right font-mono text-[13px] tabular">
              <thead className="sticky top-0 bg-pine-850 z-10">
                <tr className="text-[11px] uppercase tracking-[0.12em] text-mist-500">
                  <th className="text-left font-semibold px-5 md:px-7 py-2.5">Год</th>
                  <th className="font-semibold px-3 py-2.5">Платежи</th>
                  <th className="font-semibold px-3 py-2.5 text-mint-400/80">Тело</th>
                  <th className="font-semibold px-3 py-2.5 text-coral-400/80">Проценты</th>
                  <th className="font-semibold px-5 md:px-7 py-2.5">Остаток долга</th>
                </tr>
              </thead>
              <tbody>
                {sched.years.map((r) => (
                  <tr key={r.year} className="border-t border-pine-800 hover:bg-pine-800/60 transition-colors text-mist-200">
                    <td className="text-left px-5 md:px-7 py-2 text-mist-400 font-bold">{r.year}</td>
                    <td className="px-3 py-2">{fmtMoney(r.payment)}</td>
                    <td className="px-3 py-2 text-mint-400/90">{fmtMoney(r.principal)}</td>
                    <td className="px-3 py-2 text-coral-400/90">{fmtMoney(r.interest)}</td>
                    <td className="px-5 md:px-7 py-2 text-mist-300">{fmtMoney(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Reveal>
    </section>
  );
}

/* =============================== НАКОПЛЕНИЯ =============================== */

export function SavingsSection({
  s,
  patch,
}: {
  s: CalcState;
  patch: (p: Partial<CalcState>) => void;
}) {
  const sv = s.sav;
  const set = (p: Partial<typeof sv>) => patch({ sav: { ...sv, ...p } });

  const series = useMemo(
    () =>
      savingsSeries(
        sv.start,
        sv.monthly,
        sv.rate,
        sv.mode === "term"
          ? sv.years
          : Math.max(1, Math.ceil((monthsToGoal(sv.start, sv.monthly, sv.rate, sv.goal) ?? 600) / 12))
      ),
    [sv.start, sv.monthly, sv.rate, sv.years, sv.mode, sv.goal]
  );
  const goalMonths = useMemo(
    () => (sv.mode === "goal" ? monthsToGoal(sv.start, sv.monthly, sv.rate, sv.goal) : null),
    [sv.mode, sv.start, sv.monthly, sv.rate, sv.goal]
  );

  const final = useTween(series.final);
  const isTerm = sv.mode === "term";
  const goalReached = goalMonths !== null;
  const readyDate = useMemo(() => {
    if (!goalReached || !goalMonths) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + goalMonths);
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }, [goalReached, goalMonths]);

  return (
    <section id="savings">
      <SectionHeading
        index="02"
        icon={<IconCoins className="w-4 h-4" />}
        kicker="накопления"
        title="Копилка на взнос — вклад плюс пополнения"
        lead="Сложный процент делает тяжёлую работу: стартовая сумма, ежемесячное пополнение и ставка по вкладу. Режим «до цели» покажет, через сколько месяцев накопите на первый взнос."
      />

      <div className="grid lg:grid-cols-[5fr_7fr] gap-6 items-start">
        <Reveal>
          <Panel className="p-5 md:p-7 space-y-5">
            <Segmented
              value={sv.mode}
              onChange={(v) => set({ mode: v })}
              options={[
                { label: "На срок", value: "term" },
                { label: "До цели", value: "goal" },
              ]}
            />
            <AmountInput label="Уже накоплено" value={sv.start} onChange={(v) => set({ start: Math.min(v, 500_000_000) })} />
            <AmountInput label="Пополнение в месяц" value={sv.monthly} onChange={(v) => set({ monthly: Math.min(v, 10_000_000) })} />
            <SliderField
              label="Ставка по вкладу / накопительному счёту"
              value={sv.rate}
              min={0}
              max={25}
              step={0.5}
              onChange={(v) => set({ rate: Math.round(v * 2) / 2 })}
              format={(v) => fmtPct(v)}
              hint="Ежемесячная капитализация процентов"
            />
            {isTerm ? (
              <SliderField
                label="Горизонт накоплений"
                value={sv.years}
                min={1}
                max={30}
                step={1}
                onChange={(v) => set({ years: v })}
                format={(v) => `${v} ${plural(v, "год", "года", "лет")}`}
              />
            ) : (
              <div>
                <AmountInput
                  label="Целевая сумма"
                  value={sv.goal}
                  min={sv.start + 1}
                  onChange={(v) => set({ goal: Math.max(sv.start + 1, v) })}
                />
                <button
                  onClick={() => set({ goal: Math.max(sv.start + 1, s.down) })}
                  className="mt-2.5 px-3 py-1.5 rounded-full border border-brass-400/40 bg-brass-400/10 text-[12px] font-semibold text-brass-300 hover:bg-brass-400/20 hover:-translate-y-px transition-all duration-200"
                >
                  Цель = первый взнос из раздела 01 ({fmtCompact(s.down)})
                </button>
              </div>
            )}
            {sv.mode === "goal" && (
              <div className={`rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${goalReached ? "border-mint-500/40 bg-mint-500/8 text-mint-300" : "border-coral-500/40 bg-coral-500/8 text-coral-300"}`}>
                {goalReached ? (
                  <>
                    Цель будет достигнута через{" "}
                    <b className="font-mono tabular">{fmtYears(goalMonths!)}</b>
                    {readyDate && goalMonths! > 0 && (
                      <> — готово к <b className="capitalize">{readyDate}</b>.</>
                    )}
                  </>
                ) : (
                  <>При таких темпах цель недостижима даже за 50 лет — увеличьте пополнение или ставку.</>
                )}
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={120}>
          <div className="space-y-4">
            <Panel className="p-6 md:p-7 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint-400/70 to-transparent" />
              <p className="text-[11px] uppercase tracking-[0.16em] text-mist-500 font-semibold mb-2">
                {isTerm ? `На счёте через ${sv.years} ${plural(sv.years, "год", "года", "лет")}` : "Итог при достижении цели"}
              </p>
              <p className="font-display font-bold text-[34px] md:text-[42px] leading-none text-mint-400 tabular">
                {fmtMoney(final)}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Внесено" value={fmtCompact(series.contributed)} tone="neutral" />
                <Stat label="Процентами" value={`+${fmtCompact(series.interest)}`} tone="mint" />
                <Stat
                  label="Доля процентов"
                  value={fmtPct((series.interest / (series.final || 1)) * 100, 0)}
                  tone="brass"
                  sub="работает сложный процент"
                />
              </div>
            </Panel>
            <Panel className="p-5 md:p-7">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                <h3 className="font-display font-medium text-lg md:text-xl text-mist-50">
                  Рост счёта по годам
                </h3>
                <span className="font-mono text-[12px] text-mist-500 tabular">пунктир — сумма взносов</span>
              </div>
              <GrowthArea rows={series.years} />
            </Panel>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
