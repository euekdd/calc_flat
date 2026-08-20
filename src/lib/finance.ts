export type PaymentType = "annuity" | "diff";

export interface YearRow {
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface MonthPoint {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface ScheduleResult {
  basePayment: number; // аннуитетный платёж (или первый при дифф.)
  lastPayment: number;
  totalInterest: number;
  totalPaid: number;
  months: number; // фактический срок с учётом досрочных
  years: YearRow[];
  monthly: MonthPoint[];
  credit: number;
}

/** Аннуитетный платёж для тела кредита. */
export function annuityPayment(credit: number, ratePct: number, months: number): number {
  if (credit <= 0 || months <= 0) return 0;
  const r = ratePct / 100 / 12;
  if (r <= 0) return credit / months;
  const k = Math.pow(1 + r, months);
  return (credit * r * k) / (k - 1);
}

/** Полная помесячная симуляция графика платежей, с досрочными взносами. */
export function buildSchedule(
  price: number,
  down: number,
  ratePct: number,
  years: number,
  extraMonthly = 0,
  type: PaymentType = "annuity"
): ScheduleResult {
  const credit = Math.max(0, price - down);
  const r = ratePct / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  const annuity =
    r > 0 ? (credit * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : credit / n;

  let balance = credit;
  const monthly: MonthPoint[] = [];
  const yearAgg = new Map<number, YearRow>();
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  let lastPayment = 0;

  for (let m = 1; m <= n && balance > 0.005; m++) {
    const interest = balance * r;
    let principal =
      type === "annuity" ? annuity - interest : credit / n;
    principal += extraMonthly;
    if (principal > balance) principal = balance;
    if (principal < 0) principal = 0;
    const payment = principal + interest;

    balance -= principal;
    if (balance < 0.005) balance = 0;

    totalInterest += interest;
    totalPaid += payment;
    months = m;
    lastPayment = payment;
    monthly.push({ month: m, payment, interest, principal, balance });

    const year = Math.ceil(m / 12);
    const row = yearAgg.get(year) ?? { year, payment: 0, principal: 0, interest: 0, balance };
    row.payment += payment;
    row.principal += principal;
    row.interest += interest;
    row.balance = balance;
    yearAgg.set(year, row);
  }

  return {
    basePayment: months > 0 ? monthly[0].payment : 0,
    lastPayment,
    totalInterest,
    totalPaid,
    months,
    years: [...yearAgg.values()].sort((a, b) => a.year - b.year),
    monthly,
    credit,
  };
}

/* ------------------------------ накопления ------------------------------ */

export interface SavingsYear {
  year: number;
  contributed: number; // cumulatively invested (start + monthly)
  interest: number; // cumulative interest earned
  balance: number;
}

export function savingsSeries(
  start: number,
  monthly: number,
  ratePct: number,
  years: number
): { years: SavingsYear[]; final: number; contributed: number; interest: number } {
  const r = ratePct / 100 / 12;
  let balance = start;
  let contributed = start;
  const rows: SavingsYear[] = [];
  const totalYears = Math.max(1, Math.round(years));
  for (let y = 1; y <= totalYears; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + monthly;
      contributed += monthly;
    }
    rows.push({ year: y, contributed, interest: balance - contributed, balance });
  }
  return {
    years: rows,
    final: balance,
    contributed,
    interest: balance - contributed,
  };
}

/** Сколько месяцев нужно, чтобы дорасти до цели (null — если за 50 лет не выйти). */
export function monthsToGoal(
  start: number,
  monthly: number,
  ratePct: number,
  goal: number
): number | null {
  if (start >= goal) return 0;
  const r = ratePct / 100 / 12;
  let balance = start;
  for (let m = 1; m <= 600; m++) {
    balance = balance * (1 + r) + monthly;
    if (balance >= goal) return m;
  }
  return null;
}

/* --------------------------------- аренда -------------------------------- */

export interface RentYear {
  year: number;
  yearlyRent: number;
  monthRent: number; // аренда к концу года
}

export function rentSeries(
  monthlyRent: number,
  indexPct: number,
  years: number
): { years: RentYear[]; totalPaid: number; finalRent: number } {
  const totalYears = Math.max(1, Math.round(years));
  const rows: RentYear[] = [];
  let total = 0;
  let rent = monthlyRent;
  for (let y = 1; y <= totalYears; y++) {
    let yearly = 0;
    for (let m = 0; m < 12; m++) {
      yearly += rent;
      rent *= 1 + indexPct / 100 / 12; // плавная ежемесячная индексация
    }
    total += yearly;
    rows.push({ year: y, yearlyRent: yearly, monthRent: rent });
  }
  return { years: rows, totalPaid: total, finalRent: rent };
}

/* --------------------------- купить vs снимать --------------------------- */

export interface CompareParams {
  price: number;
  down: number;
  ratePct: number;
  years: number;
  extraMonthly: number;
  type: PaymentType;
  rentMonthly: number;
  rentIndexPct: number;
  depositMonths: number; // залог = N месячных аренд (заморожен, не инвестируется)
  appreciationPct: number; // рост стоимости квартиры в год
  investRatePct: number; // доходность вложений арендатора в год
  ownerCosts: number; // ЖКУ + страховка + обслуживание в месяц
}

export interface ComparePoint {
  year: number;
  buyNet: number; // нетто-капитал покупателя
  rentNet: number; // инвестиционный портфель арендатора
}

export interface CompareResult {
  points: ComparePoint[];
  breakeven: { year: number; month: number } | null;
  finalBuy: number;
  finalRent: number;
  delta: number; // finalBuy − finalRent
  propertyFinal: number;
  debtFinal: number;
  totalRentPaid: number;
  totalOwnerCosts: number;
  totalMortgagePaid: number;
  rentMonthlySeries: number[]; // аренда на конец каждого года
}

export function compareBuyRent(p: CompareParams): CompareResult {
  const schedule = buildSchedule(p.price, p.down, p.ratePct, p.years, p.extraMonthly, p.type);
  const months = Math.max(1, Math.round(p.years * 12));
  const ir = p.investRatePct / 100 / 12;
  const deposit = p.rentMonthly * p.depositMonths;

  let pot = Math.max(0, p.down - deposit); // взнос минус залог — в инвестиции
  let ownerPot = 0; // освободившиеся платежи собственника после выплаты ипотеки
  let lastBuyerOut = p.ownerCosts;
  let rent = p.rentMonthly;
  let totalRentPaid = 0;
  let totalOwnerCosts = 0;
  let buyNet = p.price - schedule.credit;
  let rentNet = pot;

  const points: ComparePoint[] = [{ year: 0, buyNet, rentNet }];
  const rentMonthlySeries: number[] = [];
  let breakeven: CompareResult["breakeven"] = null;
  if (buyNet >= rentNet && schedule.credit > 0) breakeven = { year: 0, month: 0 };

  for (let m = 1; m <= months; m++) {
    const paidOff = m > schedule.monthly.length;
    const mp = schedule.monthly[Math.min(m - 1, schedule.monthly.length - 1)];
    let ownerOut: number;
    if (!paidOff) {
      ownerOut = mp.payment + p.ownerCosts;
      lastBuyerOut = ownerOut;
    } else {
      ownerOut = p.ownerCosts;
      // ипотека выплачена: бывший платёж уходит в те же инвестиции
      ownerPot = ownerPot * (1 + ir) + Math.max(0, lastBuyerOut - p.ownerCosts);
    }

    totalOwnerCosts += p.ownerCosts;
    totalRentPaid += rent;

    const diff = ownerOut - rent; // сколько арендатор инвестирует сверх
    pot = pot * (1 + ir) + diff;
    if (pot < 0) pot = 0;
    rent *= 1 + p.rentIndexPct / 100 / 12;
    rentNet = pot;

    const balance = paidOff ? 0 : mp.balance;
    const property = p.price * Math.pow(1 + p.appreciationPct / 100, m / 12);
    buyNet = property - balance + ownerPot;

    if (breakeven === null && buyNet >= rentNet) {
      breakeven = { year: Math.floor((m - 1) / 12), month: ((m - 1) % 12) + 1 };
    }
    if (m % 12 === 0) {
      points.push({ year: m / 12, buyNet, rentNet });
      rentMonthlySeries.push(rent);
    }
  }

  return {
    points,
    breakeven,
    finalBuy: buyNet,
    finalRent: rentNet,
    delta: buyNet - rentNet,
    propertyFinal: p.price * Math.pow(1 + p.appreciationPct / 100, p.years),
    debtFinal: schedule.monthly.length ? schedule.monthly[schedule.monthly.length - 1].balance : 0,
    totalRentPaid,
    totalOwnerCosts,
    totalMortgagePaid: schedule.totalPaid,
    rentMonthlySeries,
  };
}

/* ------------------------------ форматирование ---------------------------- */

const NBSP = "\u00A0";

export function fmtMoney(v: number, digits = 0): string {
  const rounded = Math.round(v * 10 ** digits) / 10 ** digits;
  return (
    rounded.toLocaleString("ru-RU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) +
    NBSP +
    "₽"
  );
}

export function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}${NBSP}млрд${NBSP}₽`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}${NBSP}млн${NBSP}₽`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3).toLocaleString("ru-RU")} тыс. ₽`;
  return `${sign}${Math.round(abs)}${NBSP}₽`;
}

export function fmtPct(v: number, digits = 1): string {
  return v.toLocaleString("ru-RU", { maximumFractionDigits: digits }) + "%";
}

export function fmtYears(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const py = plural(y, "год", "года", "лет");
  if (y === 0) return `${m} мес.`;
  if (m === 0) return `${y} ${py}`;
  return `${y} г. ${m} мес.`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (d > 1 && d < 5) return few;
  if (d === 1) return one;
  return many;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
