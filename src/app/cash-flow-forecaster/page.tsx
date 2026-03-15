"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseCurrency(raw: string): number {
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

function toCurrencyInput(raw: string): string {
  const num = parseCurrency(raw);
  if (num === 0 && raw === "") return "";
  return num.toLocaleString("en-US");
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function dscrColor(dscr: number): string {
  if (dscr >= 1.25) return "text-emerald-400";
  if (dscr >= 1.15) return "text-yellow-400";
  if (dscr >= 1.0) return "text-orange-400";
  return "text-red-400";
}

function dscrBg(dscr: number): string {
  if (dscr >= 1.25) return "bg-emerald-500/15 border-emerald-500/30";
  if (dscr >= 1.15) return "bg-yellow-500/15 border-yellow-500/30";
  if (dscr >= 1.0) return "bg-orange-500/15 border-orange-500/30";
  return "bg-red-500/15 border-red-500/30";
}

function dscrBarColor(dscr: number): string {
  if (dscr >= 1.25) return "bg-emerald-400";
  if (dscr >= 1.15) return "bg-yellow-400";
  if (dscr >= 1.0) return "bg-orange-400";
  return "bg-red-400";
}

/* ------------------------------------------------------------------ */
/*  Forecast engine                                                    */
/* ------------------------------------------------------------------ */

interface MonthData {
  month: number;
  revenue: number;
  expenses: number;
  noi: number;
  cumCash: number;
  dscr: number;
}

function forecast(
  monthlyRev: number,
  monthlyExp: number,
  revGrowth: number,
  expGrowth: number,
  existingDebt: number,
  proposedDebt: number,
  oneTimeAmount: number,
  oneTimeMonth: number,
  oneTimeType: "income" | "expense"
): MonthData[] {
  const totalDebt = existingDebt + proposedDebt;
  const months: MonthData[] = [];
  let cumCash = 0;

  for (let m = 1; m <= 12; m++) {
    const rev = monthlyRev * Math.pow(1 + revGrowth / 100, m - 1);
    let exp = monthlyExp * Math.pow(1 + expGrowth / 100, m - 1);

    let adjRev = rev;
    if (m === oneTimeMonth && oneTimeAmount > 0) {
      if (oneTimeType === "income") adjRev += oneTimeAmount;
      else exp += oneTimeAmount;
    }

    const noi = adjRev - exp;
    cumCash += noi - totalDebt;
    const dscr = totalDebt > 0 ? noi / totalDebt : noi > 0 ? 99 : 0;

    months.push({
      month: m,
      revenue: adjRev,
      expenses: exp,
      noi,
      cumCash,
      dscr,
    });
  }
  return months;
}

/* ------------------------------------------------------------------ */
/*  CurrencyInput                                                      */
/* ------------------------------------------------------------------ */

function CurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-400">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(toCurrencyInput(e.target.value))}
          placeholder="0"
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-8 pr-4 text-white font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar charts                                                         */
/* ------------------------------------------------------------------ */

function RevenueExpenseChart({ data }: { data: MonthData[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.expenses)));
  const chartMax = maxVal * 1.15;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-white">Revenue vs Expenses</h3>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5">
        <div className="flex items-end gap-1.5 h-48">
          {data.map((d) => (
            <div key={d.month} className="flex-1 flex items-end gap-[2px] h-full">
              <div className="flex-1 flex flex-col justify-end h-full">
                <div
                  className="w-full bg-emerald-400/80 rounded-t"
                  style={{ height: `${(d.revenue / chartMax) * 100}%` }}
                />
              </div>
              <div className="flex-1 flex flex-col justify-end h-full">
                <div
                  className="w-full bg-orange-400/80 rounded-t"
                  style={{ height: `${(d.expenses / chartMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          {data.map((d) => (
            <div
              key={d.month}
              className="flex-1 text-center text-[11px] font-mono text-slate-500"
            >
              M{d.month}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded bg-emerald-400/80" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded bg-orange-400/80" /> Expenses
          </span>
        </div>
      </div>
    </div>
  );
}

function DscrTrajectoryChart({ data }: { data: MonthData[] }) {
  const maxDscr = Math.max(...data.map((d) => d.dscr), 1.5);
  const chartMax = Math.min(maxDscr * 1.2, 10);

  const thresholds = [
    { val: 1.0, label: "1.0x", color: "text-orange-400" },
    { val: 1.15, label: "1.15x", color: "text-yellow-400" },
    { val: 1.25, label: "1.25x", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-white">DSCR Trajectory</h3>
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5">
        <div className="relative">
          {/* Threshold lines */}
          {thresholds.map((t) => {
            const pct = (t.val / chartMax) * 100;
            if (pct > 100) return null;
            return (
              <div
                key={t.val}
                className="absolute w-full border-t border-dashed border-slate-600/60 flex items-center"
                style={{ bottom: `${pct}%` }}
              >
                <span
                  className={`absolute -top-3 right-0 text-[10px] font-mono ${t.color}`}
                >
                  {t.label}
                </span>
              </div>
            );
          })}
          <div className="flex items-end gap-1.5 h-48">
            {data.map((d) => {
              const height = Math.min((d.dscr / chartMax) * 100, 100);
              return (
                <div key={d.month} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t ${dscrBarColor(d.dscr)}`}
                    style={{ height: `${Math.max(height, 1)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-1.5 mt-2">
          {data.map((d) => (
            <div
              key={d.month}
              className="flex-1 text-center text-[10px] font-mono text-slate-500"
            >
              {d.dscr < 10 ? d.dscr.toFixed(2) : "9.9+"}
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-0.5">
          {data.map((d) => (
            <div
              key={d.month}
              className="flex-1 text-center text-[11px] font-mono text-slate-500"
            >
              M{d.month}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CashFlowForecaster() {
  const [monthlyRev, setMonthlyRev] = useState("");
  const [monthlyExp, setMonthlyExp] = useState("");
  const [revGrowth, setRevGrowth] = useState(2);
  const [expGrowth, setExpGrowth] = useState(1);
  const [existingDebt, setExistingDebt] = useState("");
  const [proposedDebt, setProposedDebt] = useState("");
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [oneTimeMonth, setOneTimeMonth] = useState(6);
  const [oneTimeType, setOneTimeType] = useState<"income" | "expense">("income");
  const [showResults, setShowResults] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const rev = parseCurrency(monthlyRev);
  const exp = parseCurrency(monthlyExp);
  const debt = parseCurrency(existingDebt);
  const newDebt = parseCurrency(proposedDebt);
  const otAmount = parseCurrency(oneTimeAmount);

  const data = forecast(
    rev,
    exp,
    revGrowth,
    expGrowth,
    debt,
    newDebt,
    otAmount,
    oneTimeMonth,
    oneTimeType
  );

  // Optimistic scenario: +3% rev growth, -2% exp growth
  const optimisticData = forecast(
    rev,
    exp,
    revGrowth + 3,
    Math.max(expGrowth - 2, -5),
    debt,
    newDebt,
    otAmount,
    oneTimeMonth,
    oneTimeType
  );

  const totalDebt = debt + newDebt;
  const currentNoi = rev - exp;
  const currentDscr = totalDebt > 0 ? currentNoi / totalDebt : currentNoi > 0 ? 99 : 0;

  const m12 = data[11];
  const cumCash = m12?.cumCash ?? 0;

  // Threshold crossing months
  const findThreshold = (threshold: number) => {
    const m = data.find((d) => d.dscr >= threshold);
    return m ? m.month : null;
  };
  const cross100 = findThreshold(1.0);
  const cross115 = findThreshold(1.15);
  const cross125 = findThreshold(1.25);

  // Bankable determination
  const bankableMonth = cross125 ?? cross115;
  const bankableThreshold = cross125 ? "1.25x" : cross115 ? "1.15x" : null;
  const alreadyBankable = currentDscr >= 1.25;

  const handleCalculate = useCallback(() => {
    setShowResults(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // Revenue growth color: green if positive
  const revGrowthColor =
    revGrowth > 0 ? "text-emerald-400" : revGrowth < 0 ? "text-red-400" : "text-slate-400";
  // Expense growth color: green if negative (costs shrinking), orange/red if positive
  const expGrowthColor =
    expGrowth < 0 ? "text-emerald-400" : expGrowth > 0 ? "text-orange-400" : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header badge */}
      <div className="flex justify-center pt-6 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400 hover:bg-cyan-500/20 transition-colors"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Business Eligibility
        </Link>
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-20 flex-1">
        {/* Title */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Cash Flow Forecaster
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Project your cash flow 12 months out and see exactly when your
            numbers cross lender approval thresholds.
          </p>
        </div>

        {/* Input panel */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-8 mb-6">
          {/* Current Monthly Numbers */}
          <div className="space-y-4">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
              Current Monthly Numbers
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Monthly Revenue"
                value={monthlyRev}
                onChange={setMonthlyRev}
              />
              <CurrencyInput
                label="Monthly Expenses"
                value={monthlyExp}
                onChange={setMonthlyExp}
              />
            </div>
          </div>

          {/* Growth Assumptions */}
          <div className="space-y-5">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
              Growth Assumptions
            </span>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-400">
                    Revenue Growth / Month
                  </label>
                  <span className={`text-lg font-bold font-mono ${revGrowthColor}`}>
                    {revGrowth > 0 ? "+" : ""}
                    {revGrowth}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={10}
                  step={0.5}
                  value={revGrowth}
                  onChange={(e) => setRevGrowth(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-slate-700 appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                  <span>-5%</span>
                  <span>0%</span>
                  <span>+10%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-400">
                    Expense Growth / Month
                  </label>
                  <span className={`text-lg font-bold font-mono ${expGrowthColor}`}>
                    {expGrowth > 0 ? "+" : ""}
                    {expGrowth}%
                  </span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={expGrowth}
                  onChange={(e) => setExpGrowth(Number(e.target.value))}
                  className="w-full h-2 rounded-full bg-slate-700 appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                  <span>-5%</span>
                  <span>0%</span>
                  <span>+5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Debt Obligations */}
          <div className="space-y-4">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full">
              Debt Obligations
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Existing Monthly Debt"
                value={existingDebt}
                onChange={setExistingDebt}
              />
              <CurrencyInput
                label="Proposed New Monthly Debt"
                value={proposedDebt}
                onChange={setProposedDebt}
              />
            </div>
          </div>

          {/* One-Time Event */}
          <div className="space-y-4">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full">
              One-Time Event
              <span className="text-slate-500 ml-1.5 normal-case tracking-normal">
                (optional)
              </span>
            </span>
            <div className="grid sm:grid-cols-3 gap-4">
              <CurrencyInput
                label="Amount"
                value={oneTimeAmount}
                onChange={setOneTimeAmount}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">
                  Month
                </label>
                <select
                  value={oneTimeMonth}
                  onChange={(e) => setOneTimeMonth(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 px-4 text-white font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors appearance-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Month {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOneTimeType("income")}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                      oneTimeType === "income"
                        ? "bg-emerald-500/15 border border-emerald-500/50 text-emerald-400"
                        : "bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    Income
                  </button>
                  <button
                    onClick={() => setOneTimeType("expense")}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                      oneTimeType === "expense"
                        ? "bg-red-500/15 border border-red-500/50 text-red-400"
                        : "bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={rev === 0}
            className="w-full rounded-xl bg-cyan-500 py-3.5 text-base font-semibold text-slate-950 hover:bg-cyan-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Forecast My Cash Flow
          </button>
        </div>

        {/* ==================== RESULTS ==================== */}
        {showResults && (
          <div
            ref={resultsRef}
            className="animate-[fadeUp_0.5s_ease-out] space-y-8"
          >
            {/* 4 Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Current DSCR",
                  value: currentDscr < 10 ? currentDscr.toFixed(2) + "x" : "N/A",
                  good: currentDscr >= 1.25,
                  bad: currentDscr < 1.0,
                },
                {
                  label: "Month 12 DSCR",
                  value: m12.dscr < 10 ? m12.dscr.toFixed(2) + "x" : "N/A",
                  good: m12.dscr >= 1.25,
                  bad: m12.dscr < 1.0,
                },
                {
                  label: "Month 12 NOI",
                  value: fmt(m12.noi),
                  good: m12.noi > 0,
                  bad: m12.noi <= 0,
                },
                {
                  label: "12-Mo Cumulative",
                  value: fmt(cumCash),
                  good: cumCash > 0,
                  bad: cumCash <= 0,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`rounded-xl border p-4 text-center space-y-1 ${
                    card.good
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : card.bad
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-slate-700/50 bg-slate-900/50"
                  }`}
                >
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p
                    className={`text-xl sm:text-2xl font-bold font-mono ${
                      card.good ? "text-emerald-400" : card.bad ? "text-red-400" : "text-white"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Bankable By callout */}
            {totalDebt > 0 && (
              <div
                className={`rounded-xl border p-5 ${
                  alreadyBankable
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : bankableMonth
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                {alreadyBankable ? (
                  <p className="text-emerald-400 font-semibold text-center">
                    You&rsquo;re already bankable — your current DSCR of{" "}
                    <span className="font-mono">
                      {currentDscr.toFixed(2)}x
                    </span>{" "}
                    exceeds the 1.25x standard.
                  </p>
                ) : bankableMonth ? (
                  <p className="text-emerald-400 font-semibold text-center">
                    Bankable by Month {bankableMonth} — you cross the{" "}
                    {bankableThreshold} threshold with your current growth trajectory.
                  </p>
                ) : (
                  <p className="text-red-400 font-semibold text-center">
                    Not bankable within 12 months at current trajectory. Consider
                    increasing revenue growth or reducing expenses.
                  </p>
                )}
              </div>
            )}

            {/* DSCR Threshold Timeline */}
            {totalDebt > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">
                  DSCR Threshold Timeline
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "1.0x Break-Even",
                      month: cross100,
                      color: "orange",
                      border: "border-orange-500/30",
                      bg: "bg-orange-500/10",
                      text: "text-orange-400",
                    },
                    {
                      label: "1.15x SBA Minimum",
                      month: cross115,
                      color: "yellow",
                      border: "border-yellow-500/30",
                      bg: "bg-yellow-500/10",
                      text: "text-yellow-400",
                    },
                    {
                      label: "1.25x Bank Standard",
                      month: cross125,
                      color: "emerald",
                      border: "border-emerald-500/30",
                      bg: "bg-emerald-500/10",
                      text: "text-emerald-400",
                    },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className={`rounded-xl border ${t.border} ${t.bg} p-4 text-center space-y-1`}
                    >
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        {t.label}
                      </p>
                      <p className={`text-2xl font-bold font-mono ${t.text}`}>
                        {t.month ? `Month ${t.month}` : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue vs Expenses chart */}
            <RevenueExpenseChart data={data} />

            {/* DSCR Trajectory chart */}
            {totalDebt > 0 && <DscrTrajectoryChart data={data} />}

            {/* Scenario Comparison */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">
                Scenario Comparison
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Current */}
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current Trajectory
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Month 12 Revenue</span>
                      <span className="text-white font-mono">
                        {fmt(m12.revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Month 12 NOI</span>
                      <span
                        className={`font-mono ${
                          m12.noi >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {fmt(m12.noi)}
                      </span>
                    </div>
                    {totalDebt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Month 12 DSCR</span>
                        <span className={`font-mono ${dscrColor(m12.dscr)}`}>
                          {m12.dscr < 10 ? m12.dscr.toFixed(2) + "x" : "N/A"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Cumulative Cash</span>
                      <span
                        className={`font-mono ${
                          cumCash >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {fmt(cumCash)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optimistic */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Optimistic Scenario
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Rev growth +{(revGrowth + 3).toFixed(1)}% · Exp growth{" "}
                    {Math.max(expGrowth - 2, -5) > 0 ? "+" : ""}
                    {Math.max(expGrowth - 2, -5).toFixed(1)}%
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Month 12 Revenue</span>
                      <span className="text-white font-mono">
                        {fmt(optimisticData[11].revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Month 12 NOI</span>
                      <span
                        className={`font-mono ${
                          optimisticData[11].noi >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {fmt(optimisticData[11].noi)}
                      </span>
                    </div>
                    {totalDebt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Month 12 DSCR</span>
                        <span
                          className={`font-mono ${dscrColor(
                            optimisticData[11].dscr
                          )}`}
                        >
                          {optimisticData[11].dscr < 10
                            ? optimisticData[11].dscr.toFixed(2) + "x"
                            : "N/A"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Cumulative Cash</span>
                      <span
                        className={`font-mono ${
                          optimisticData[11].cumCash >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {fmt(optimisticData[11].cumCash)}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-emerald-500/20 pt-2 mt-2">
                    <p className="text-xs text-emerald-400 font-mono">
                      +{fmt(optimisticData[11].cumCash - cumCash)} additional
                      cash flow
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Month-by-Month Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  Month-by-Month Breakdown
                </h3>
                <button
                  onClick={() => setShowTable((s) => !s)}
                  className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {showTable ? "Hide Table" : "Show Table"}
                </button>
              </div>
              {showTable && (
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-x-auto animate-[fadeUp_0.3s_ease-out]">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">
                          Month
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">
                          Revenue
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">
                          Expenses
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">
                          NOI
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">
                          Cumulative
                        </th>
                        {totalDebt > 0 && (
                          <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">
                            DSCR
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d, i) => (
                        <tr
                          key={d.month}
                          className={
                            i % 2 === 0 ? "bg-slate-800/20" : "bg-transparent"
                          }
                        >
                          <td className="py-2.5 px-4 font-mono text-slate-300">
                            {d.month}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                            {fmt(d.revenue)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-orange-400">
                            {fmt(d.expenses)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono ${
                              d.noi >= 0 ? "text-cyan-400" : "text-red-400"
                            }`}
                          >
                            {fmt(d.noi)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono ${
                              d.cumCash >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {fmt(d.cumCash)}
                          </td>
                          {totalDebt > 0 && (
                            <td
                              className={`py-2.5 px-4 text-right font-mono ${dscrColor(
                                d.dscr
                              )}`}
                            >
                              {d.dscr < 10 ? d.dscr.toFixed(2) : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Want a Complete Eligibility Breakdown?
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Get the full Bank Ready Blueprint — a personalized report with
                lender matching, document checklists, and step-by-step action
                plan.
              </p>
              <a
                href="https://businesseligibility.com/checkout/bank-ready-blueprint"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 active:scale-[0.98] transition-all"
              >
                Get Bank Ready Blueprint — $999
              </a>
              <p className="text-xs text-slate-500">Payment plans available</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-xs text-slate-600">
          Powered by{" "}
          <span className="text-slate-400 font-medium">
            Business Eligibility
          </span>
        </p>
      </footer>
    </div>
  );
}
