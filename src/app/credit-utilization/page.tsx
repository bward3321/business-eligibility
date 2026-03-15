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

function utilColor(pct: number): string {
  if (pct <= 10) return "text-emerald-400";
  if (pct <= 30) return "text-cyan-400";
  if (pct <= 50) return "text-yellow-400";
  if (pct <= 75) return "text-orange-400";
  return "text-red-400";
}

function utilBg(pct: number): string {
  if (pct <= 10) return "bg-emerald-400";
  if (pct <= 30) return "bg-cyan-400";
  if (pct <= 50) return "bg-yellow-400";
  if (pct <= 75) return "bg-orange-400";
  return "bg-red-400";
}

function utilBorder(pct: number): string {
  if (pct <= 10) return "border-emerald-500/40";
  if (pct <= 30) return "border-cyan-500/40";
  if (pct <= 50) return "border-yellow-500/40";
  if (pct <= 75) return "border-orange-500/40";
  return "border-red-500/40";
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Card {
  id: number;
  name: string;
  balance: string;
  limit: string;
}

interface PaydownItem {
  id: number;
  name: string;
  limit: number;
  balanceBefore: number;
  balanceAfter: number;
  utilBefore: number;
  utilAfter: number;
  payAmount: number;
}

/* ------------------------------------------------------------------ */
/*  Optimization engine                                                */
/* ------------------------------------------------------------------ */

function optimizePaydown(
  cards: Card[],
  availableCash: number
): { plan: PaydownItem[]; cashUsed: number; cashRemaining: number } {
  // Build working list
  const working = cards
    .map((c) => ({
      id: c.id,
      name: c.name || "Unnamed Card",
      limit: parseCurrency(c.limit),
      balance: parseCurrency(c.balance),
    }))
    .filter((c) => c.limit > 0 && c.balance > 0);

  let cash = availableCash;
  const payments: Record<number, number> = {};

  // Initialize payments
  for (const c of working) payments[c.id] = 0;

  // Phase 1: Get everything under 30% — highest utilization first
  const phase1 = [...working]
    .map((c) => ({ ...c, util: (c.balance / c.limit) * 100 }))
    .filter((c) => c.util > 30)
    .sort((a, b) => b.util - a.util);

  for (const c of phase1) {
    if (cash <= 0) break;
    const target30 = c.limit * 0.3;
    const currentBal = c.balance - (payments[c.id] ?? 0);
    const needed = currentBal - target30;
    if (needed > 0) {
      const pay = Math.min(needed, cash);
      payments[c.id] = (payments[c.id] ?? 0) + pay;
      cash -= pay;
    }
  }

  // Phase 2: Get everything under 10% — highest utilization first
  const phase2 = [...working]
    .map((c) => ({
      ...c,
      currentBal: c.balance - (payments[c.id] ?? 0),
    }))
    .map((c) => ({ ...c, util: (c.currentBal / c.limit) * 100 }))
    .filter((c) => c.util > 10)
    .sort((a, b) => b.util - a.util);

  for (const c of phase2) {
    if (cash <= 0) break;
    const target10 = c.limit * 0.1;
    const currentBal = c.balance - (payments[c.id] ?? 0);
    const needed = currentBal - target10;
    if (needed > 0) {
      const pay = Math.min(needed, cash);
      payments[c.id] = (payments[c.id] ?? 0) + pay;
      cash -= pay;
    }
  }

  // Phase 3: Pay off remaining balances — smallest first
  const phase3 = [...working]
    .map((c) => ({
      ...c,
      currentBal: c.balance - (payments[c.id] ?? 0),
    }))
    .filter((c) => c.currentBal > 0)
    .sort((a, b) => a.currentBal - b.currentBal);

  for (const c of phase3) {
    if (cash <= 0) break;
    const currentBal = c.balance - (payments[c.id] ?? 0);
    if (currentBal > 0) {
      const pay = Math.min(currentBal, cash);
      payments[c.id] = (payments[c.id] ?? 0) + pay;
      cash -= pay;
    }
  }

  const plan: PaydownItem[] = working.map((c) => {
    const pay = Math.round(payments[c.id] ?? 0);
    const balAfter = c.balance - pay;
    return {
      id: c.id,
      name: c.name,
      limit: c.limit,
      balanceBefore: c.balance,
      balanceAfter: balAfter,
      utilBefore: (c.balance / c.limit) * 100,
      utilAfter: c.limit > 0 ? (balAfter / c.limit) * 100 : 0,
      payAmount: pay,
    };
  });

  const cashUsed = availableCash - cash;
  return { plan, cashUsed: Math.round(cashUsed), cashRemaining: Math.round(cash) };
}

/* ------------------------------------------------------------------ */
/*  Currency input                                                     */
/* ------------------------------------------------------------------ */

function CurrencyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-400">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(toCurrencyInput(e.target.value))}
          placeholder={placeholder ?? "0"}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-7 pr-3 text-white font-mono text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

let nextId = 3;

export default function CreditUtilization() {
  const [cards, setCards] = useState<Card[]>([
    { id: 1, name: "", balance: "", limit: "" },
    { id: 2, name: "", balance: "", limit: "" },
  ]);
  const [availableCash, setAvailableCash] = useState("");
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const updateCard = useCallback((id: number, field: keyof Card, value: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }, []);

  const removeCard = useCallback((id: number) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCard = useCallback(() => {
    if (cards.length >= 10) return;
    setCards((prev) => [...prev, { id: nextId++, name: "", balance: "", limit: "" }]);
  }, [cards.length]);

  // Running totals
  const totalBalance = cards.reduce((s, c) => s + parseCurrency(c.balance), 0);
  const totalLimit = cards.reduce((s, c) => s + parseCurrency(c.limit), 0);
  const overallUtil = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  // Optimization
  const cash = parseCurrency(availableCash);
  const { plan, cashUsed, cashRemaining } = optimizePaydown(cards, cash);

  const newTotalBalance = plan.reduce((s, p) => s + p.balanceAfter, 0);
  const newOverallUtil = totalLimit > 0 ? (newTotalBalance / totalLimit) * 100 : 0;

  // Score impact estimate
  const utilDrop = overallUtil - newOverallUtil;
  const scoreLow = Math.round(utilDrop * 0.5);
  const scoreHigh = Math.round(utilDrop * 1.1);

  // Threshold amounts needed
  const amountFor30 = Math.max(totalBalance - totalLimit * 0.3, 0);
  const amountFor10 = Math.max(totalBalance - totalLimit * 0.1, 0);
  const amountForZero = totalBalance;
  const alreadyAt30 = overallUtil <= 30;
  const alreadyAt10 = overallUtil <= 10;
  const alreadyAtZero = totalBalance === 0;

  const handleCalculate = useCallback(() => {
    setShowResults(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

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
        <div className="text-center space-y-3 mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Credit Utilization Optimizer
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            See which cards are hurting your score the most and get an exact
            paydown plan to maximize your credit improvement.
          </p>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 mb-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="text-cyan-400 font-semibold">Did you know?</span>{" "}
            Credit utilization accounts for{" "}
            <span className="text-white font-semibold">30% of your credit score</span>.
            Dropping from 75% to under 30% utilization can improve your score by{" "}
            <span className="text-emerald-400 font-semibold">40–80 points</span> —
            often the fastest way to boost your lending eligibility.
          </p>
        </div>

        {/* Card inputs */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4 mb-4">
          {/* Header with running utilization */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Credit Cards</h2>
            {totalLimit > 0 && (
              <span
                className={`font-mono font-bold text-lg ${utilColor(overallUtil)}`}
              >
                {overallUtil.toFixed(1)}% utilization
              </span>
            )}
          </div>

          {/* Card rows */}
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={card.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
              >
                <div className="space-y-1">
                  {i === 0 && (
                    <label className="text-xs font-medium text-slate-500">
                      Card Name
                    </label>
                  )}
                  <input
                    type="text"
                    value={card.name}
                    onChange={(e) => updateCard(card.id, "name", e.target.value)}
                    placeholder={`Card ${i + 1}`}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 px-3 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && (
                    <label className="text-xs font-medium text-slate-500">
                      Balance
                    </label>
                  )}
                  <CurrencyInput
                    value={card.balance}
                    onChange={(v) => updateCard(card.id, "balance", v)}
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && (
                    <label className="text-xs font-medium text-slate-500">
                      Limit
                    </label>
                  )}
                  <CurrencyInput
                    value={card.limit}
                    onChange={(v) => updateCard(card.id, "limit", v)}
                  />
                </div>
                <button
                  onClick={() => removeCard(card.id)}
                  disabled={cards.length <= 1}
                  className="p-2.5 rounded-xl border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {cards.length < 10 && (
            <button
              onClick={addCard}
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              + Add Another Card
            </button>
          )}
        </div>

        {/* Available cash */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6 space-y-2">
          <CurrencyInput
            label="How much cash can you put toward paydown right now?"
            value={availableCash}
            onChange={setAvailableCash}
          />
        </div>

        {/* Calculate */}
        <button
          onClick={handleCalculate}
          disabled={totalBalance === 0 || totalLimit === 0}
          className="w-full rounded-xl bg-cyan-500 py-3.5 text-base font-semibold text-slate-950 hover:bg-cyan-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-8"
        >
          Optimize My Utilization
        </button>

        {/* ==================== RESULTS ==================== */}
        {showResults && (
          <div
            ref={resultsRef}
            className="animate-[fadeUp_0.5s_ease-out] space-y-8"
          >
            {/* Before / After hero */}
            <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Before */}
              <div
                className={`rounded-2xl border ${utilBorder(overallUtil)} bg-slate-900/50 p-6 text-center space-y-2`}
              >
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Current Utilization
                </p>
                <p className={`text-5xl font-bold font-mono ${utilColor(overallUtil)}`}>
                  {overallUtil.toFixed(1)}%
                </p>
                <p className={`text-sm font-medium ${utilColor(overallUtil)}`}>
                  {overallUtil > 75
                    ? "Very High"
                    : overallUtil > 50
                    ? "High"
                    : overallUtil > 30
                    ? "Moderate"
                    : overallUtil > 10
                    ? "Good"
                    : "Excellent"}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1">
                <svg className="w-8 h-8 text-emerald-400 rotate-90 sm:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {utilDrop > 0 && (
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    -{utilDrop.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* After */}
              <div
                className={`rounded-2xl border ${utilBorder(newOverallUtil)} bg-slate-900/50 p-6 text-center space-y-2 shadow-[0_0_30px_-5px] ${
                  newOverallUtil <= 10
                    ? "shadow-emerald-500/20"
                    : newOverallUtil <= 30
                    ? "shadow-cyan-500/20"
                    : "shadow-yellow-500/20"
                }`}
              >
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Optimized Utilization
                </p>
                <p className={`text-5xl font-bold font-mono ${utilColor(newOverallUtil)}`}>
                  {newOverallUtil.toFixed(1)}%
                </p>
                <p className={`text-sm font-medium ${utilColor(newOverallUtil)}`}>
                  {newOverallUtil > 75
                    ? "Very High"
                    : newOverallUtil > 50
                    ? "High"
                    : newOverallUtil > 30
                    ? "Moderate"
                    : newOverallUtil > 10
                    ? "Good"
                    : "Excellent"}
                </p>
              </div>
            </div>

            {/* Score impact */}
            {utilDrop > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                <p className="text-emerald-400 font-semibold text-lg">
                  Estimated Score Impact:{" "}
                  <span className="font-mono">
                    +{scoreLow} to +{scoreHigh} points
                  </span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Based on reducing utilization by {utilDrop.toFixed(1)} percentage points
                </p>
              </div>
            )}

            {/* Paydown Plan */}
            {plan.some((p) => p.payAmount > 0) && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">
                  Your Paydown Plan
                </h3>
                <div className="space-y-3">
                  {plan
                    .filter((p) => p.payAmount > 0)
                    .sort((a, b) => b.payAmount - a.payAmount)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-semibold">
                              {p.name}
                            </span>
                            <span className="text-xs text-slate-500 ml-2 font-mono">
                              Limit: {fmt(p.limit)}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-sm font-semibold text-emerald-400 font-mono">
                            Pay {fmt(p.payAmount)}
                          </span>
                        </div>

                        {/* Utilization bars */}
                        <div className="space-y-1.5">
                          {/* Before bar (faded) */}
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 w-12 shrink-0">
                              Before
                            </span>
                            <div className="flex-1 relative h-3 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${utilBg(p.utilBefore)} opacity-40`}
                                style={{ width: `${Math.min(p.utilBefore, 100)}%` }}
                              />
                              {/* 30% marker */}
                              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: "30%" }} />
                            </div>
                            <span className={`text-xs font-mono w-12 text-right ${utilColor(p.utilBefore)}`}>
                              {p.utilBefore.toFixed(0)}%
                            </span>
                          </div>
                          {/* After bar */}
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500 w-12 shrink-0">
                              After
                            </span>
                            <div className="flex-1 relative h-3 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${utilBg(p.utilAfter)}`}
                                style={{ width: `${Math.min(p.utilAfter, 100)}%` }}
                              />
                              {/* 30% marker */}
                              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: "30%" }} />
                            </div>
                            <span className={`text-xs font-mono w-12 text-right ${utilColor(p.utilAfter)}`}>
                              {p.utilAfter.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Balance text */}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>
                            Balance: {fmt(p.balanceBefore)} → {fmt(p.balanceAfter)}
                          </span>
                        </div>
                      </div>
                    ))}

                  {cashRemaining > 0 && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                      <p className="text-sm text-emerald-400 font-medium">
                        <span className="font-mono">{fmt(cashRemaining)}</span>{" "}
                        remaining after all cards optimized
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Target Thresholds */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">
                Target Thresholds
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-center space-y-2">
                  <p className="text-xs font-medium text-yellow-400 uppercase tracking-wider">
                    Under 30%
                  </p>
                  <p className="text-sm text-slate-400">
                    Minimum for lenders
                  </p>
                  {alreadyAt30 ? (
                    <p className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Already there
                    </p>
                  ) : (
                    <p className="text-yellow-400 font-bold font-mono">
                      {fmt(amountFor30)} needed
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center space-y-2">
                  <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
                    Under 10%
                  </p>
                  <p className="text-sm text-slate-400">
                    Optimal for best rates
                  </p>
                  {alreadyAt10 ? (
                    <p className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Already there
                    </p>
                  ) : (
                    <p className="text-cyan-400 font-bold font-mono">
                      {fmt(amountFor10)} needed
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center space-y-2">
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    Zero Balances
                  </p>
                  <p className="text-sm text-slate-400">
                    Maximum impact
                  </p>
                  {alreadyAtZero ? (
                    <p className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Already there
                    </p>
                  ) : (
                    <p className="text-emerald-400 font-bold font-mono">
                      {fmt(amountForZero)} needed
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Timing Matters */}
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 space-y-3">
              <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Timing Matters
              </h3>
              <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
                <p>
                  <span className="text-white font-semibold">Pay 2–3 days before your statement closing date</span>,
                  not the due date. Your balance on the statement closing date is what gets reported to the bureaus.
                  Paying by the due date avoids late fees but doesn&rsquo;t help your utilization.
                </p>
                <p>
                  <span className="text-white font-semibold">Wait 30–45 days</span> after making payments
                  for new balances to be reported to the credit bureaus before applying for a business loan.
                  This ensures lenders see your improved utilization.
                </p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Debt", value: fmt(totalBalance), color: "text-white" },
                { label: "Total Limits", value: fmt(totalLimit), color: "text-white" },
                { label: "Cash Applied", value: fmt(cashUsed), color: "text-cyan-400" },
                {
                  label: "New Total Debt",
                  value: fmt(newTotalBalance),
                  color: newTotalBalance < totalBalance ? "text-emerald-400" : "text-white",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 text-center space-y-1"
                >
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className={`text-xl font-bold font-mono ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
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
