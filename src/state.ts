import { PaymentType } from "./lib/finance";

export interface RentState {
  monthly: number;
  indexPct: number;
  depositMonths: number; // залог в месяцах аренды
}

export interface SavState {
  start: number;
  monthly: number;
  rate: number;
  years: number;
  mode: "term" | "goal";
  goal: number;
}

export interface CmpState {
  appreciationPct: number;
  investRatePct: number;
  ownerCosts: number;
  scenario: ScenarioId | null;
}

export interface CalcState {
  price: number;
  down: number;
  rate: number;
  years: number;
  type: PaymentType;
  extra: number;
  rent: RentState;
  sav: SavState;
  cmp: CmpState;
}

export const DEFAULTS: CalcState = {
  price: 9_800_000,
  down: 2_940_000,
  rate: 18,
  years: 25,
  type: "annuity",
  extra: 0,
  rent: { monthly: 48_000, indexPct: 5, depositMonths: 1 },
  sav: { start: 800_000, monthly: 60_000, rate: 14, years: 10, mode: "goal", goal: 2_940_000 },
  cmp: { appreciationPct: 4, investRatePct: 10, ownerCosts: 6_000, scenario: "base" },
};

export type ScenarioId = "calm" | "base" | "optimist";

export const SCENARIOS: Record<ScenarioId, { label: string; appr: number; inv: number; note: string }> = {
  calm: { label: "Осторожный", appr: 2, inv: 8, note: "Жильё почти за инфляцией, вложения консервативные" },
  base: { label: "Базовый", appr: 4, inv: 10, note: "Умеренный рост цен и доходность депозитов/облигаций" },
  optimist: { label: "Оптимистичный", appr: 7, inv: 13, note: "Жильё дорожает быстрее инфляции, доходность высокая" },
};
