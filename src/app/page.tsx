"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ─── helpers ─── */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseCurrency(raw: string): number {
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

function toCurrencyInput(raw: string): string {
  const num = parseCurrency(raw);
  if (num === 0 && raw === "") return "";
  return num.toLocaleString("en-US");
}

/* ─── score color logic ─── */

function scoreColor(dscr: number): string {
  if (dscr < 1.0) return "#f87171"; // red
  if (dscr < 1.15) return "#fb923c"; // orange
  if (dscr < 1.25) return "#facc15"; // yellow
  return "#34d399"; // green
}

function scoreLabel(dscr: number): string {
  if (dscr < 1.0) return "Below Break-Even";
  if (dscr < 1.15) return "Marginal";
  if (dscr < 1.25) return "Adequate";
  return "Strong";
}

/* ─── analysis text ─── */

function getAnalysis(dscr: number): string {
  if (dscr < 1.0)
    return `Your business is generating less income than it needs to cover its debt obligations. For every dollar of debt you owe, you're only producing ${dscr.toFixed(2)} cents of operating income. This means you'd need to dip into savings or outside funds to make your payments. Most lenders will not approve new financing at this level.`;
  if (dscr < 1.15)
    return `Your business is just barely covering its debt payments. While you're technically above break-even, there's very little margin for unexpected expenses or revenue dips. Most conventional lenders require at least a 1.15x DSCR, so you may face limited financing options at this level.`;
  if (dscr < 1.25)
    return `Your business has a reasonable cushion above its debt obligations. You're generating enough income to cover payments with some breathing room. You'll qualify for several loan programs, though some lenders with stricter requirements may want to see a higher ratio.`;
  return `Your business demonstrates strong debt service capacity. For every dollar of debt, you're generating $${dscr.toFixed(2)} in operating income. This gives you a healthy buffer and positions you well for most lending programs, including favorable terms and competitive rates.`;
}

/* ─── action items ─── */

function getActionItems(dscr: number): string[] {
  if (dscr < 1.0)
    return [
      "Focus on increasing revenue or reducing operating expenses before applying for new debt",
      "Consider renegotiating existing debt terms to lower monthly payments",
      "Explore equity financing or investor funding as alternatives to debt",
      "Build a 3-6 month cash reserve to demonstrate financial stability",
      "Consult with a financial advisor to create a path to a 1.25x+ DSCR",
    ];
  if (dscr < 1.15)
    return [
      "Target reducing operating expenses by 5-10% to improve your ratio",
      "Look into SBA-backed loans which may have more flexible DSCR requirements",
      "Delay new debt until your DSCR reaches 1.25x for better loan terms",
      "Increase pricing or add revenue streams to boost net operating income",
    ];
  if (dscr < 1.25)
    return [
      "You're close to the preferred threshold — a small revenue boost could unlock better rates",
      "Compare SBA 7(a) and conventional bank options to find the best terms",
      "Consider prepaying some existing debt to improve your ratio further",
      "Document your upward revenue trend to strengthen your loan application",
    ];
  return [
    "Shop multiple lenders to negotiate the most competitive rates and terms",
    "Consider accelerating growth plans — your financials support additional borrowing",
    "Lock in long-term fixed rates while your DSCR is strong",
    "Maintain this ratio by scaling debt proportionally with income growth",
  ];
}

/* ─── lender thresholds ─── */

const LENDERS = [
  { name: "SBA 7(a)", minDscr: 1.15, typical: "1.15x – 1.25x" },
  { name: "Conventional Bank", minDscr: 1.25, typical: "1.25x – 1.5x" },
  { name: "SBA 504", minDscr: 1.2, typical: "1.20x+" },
  { name: "Alternative Lenders", minDscr: 1.0, typical: "1.0x+" },
];

/* ─── components ─── */

function CurrencyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(toCurrencyInput(raw));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-400">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3.5 pl-9 pr-4 font-mono text-base text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
      </div>
    </div>
  );
}

function GaugeBar({ dscr }: { dscr: number }) {
  // Map DSCR to a 0-100% position. 0 = 0x, 100% = 2.0x
  const pct = Math.min(Math.max((dscr / 2.0) * 100, 0), 100);
  const thresholds = [
    { value: 1.0, label: "1.0x", pct: 50 },
    { value: 1.15, label: "1.15x", pct: 57.5 },
    { value: 1.25, label: "1.25x", pct: 62.5 },
  ];

  return (
    <div className="w-full space-y-2">
      <div className="relative h-4 rounded-full overflow-hidden bg-slate-800">
        {/* gradient background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(to right, #ef4444 0%, #f87171 45%, #fb923c 50%, #facc15 57%, #34d399 65%, #10b981 100%)",
          }}
        />
        {/* dark overlay for unfilled area */}
        <div
          className="absolute top-0 right-0 h-full bg-slate-800/90 transition-all duration-1000 ease-out"
          style={{ width: `${100 - pct}%` }}
        />
        {/* indicator dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-white shadow-lg transition-all duration-1000 ease-out"
          style={{ left: `${pct}%`, background: scoreColor(dscr) }}
        />
      </div>
      {/* threshold markers */}
      <div className="relative h-6">
        {thresholds.map((t) => (
          <div
            key={t.value}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: `${t.pct}%` }}
          >
            <div className="w-px h-2 bg-slate-600 mx-auto" />
            <span className="text-[10px] font-mono text-slate-500">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="text-2xl font-bold font-mono" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function AnimatedScore({
  target,
  duration = 1200,
}: {
  target: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return (
    <span className="font-mono text-6xl sm:text-7xl font-bold tabular-nums" style={{ color: scoreColor(target) }}>
      {display.toFixed(2)}x
    </span>
  );
}

function LenderTable({ dscr }: { dscr: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50">
            <th className="px-4 py-3 font-semibold text-slate-300">Lender Type</th>
            <th className="px-4 py-3 font-semibold text-slate-300 text-center">
              Min DSCR
            </th>
            <th className="px-4 py-3 font-semibold text-slate-300 text-center">
              Typical Range
            </th>
            <th className="px-4 py-3 font-semibold text-slate-300 text-center">
              You Qualify
            </th>
          </tr>
        </thead>
        <tbody>
          {LENDERS.map((l) => {
            const qualifies = dscr >= l.minDscr;
            return (
              <tr
                key={l.name}
                className="border-b border-slate-700/30 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-slate-200">
                  {l.name}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-400">
                  {l.minDscr.toFixed(2)}x
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-400">
                  {l.typical}
                </td>
                <td className="px-4 py-3 text-center">
                  {qualifies ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-lg">
                      ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/20 text-red-400 text-lg">
                      ✗
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── main page ─── */

export default function Home() {
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
  const [existingDebt, setExistingDebt] = useState("");
  const [proposedDebt, setProposedDebt] = useState("");
  const [result, setResult] = useState<{
    dscr: number;
    noi: number;
    totalDebt: number;
    monthlySurplus: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const calculate = useCallback(() => {
    const rev = parseCurrency(revenue);
    const exp = parseCurrency(expenses);
    const existing = parseCurrency(existingDebt);
    const proposed = parseCurrency(proposedDebt);

    const noi = rev - exp;
    const totalDebt = existing + proposed;

    if (totalDebt === 0) return;

    const dscr = noi / totalDebt;
    const monthlySurplus = (noi - totalDebt) / 12;

    setResult({ dscr, noi, totalDebt, monthlySurplus });
    setShowResult(false);
    // trigger animation on next frame
    requestAnimationFrame(() => setShowResult(true));
  }, [revenue, expenses, existingDebt, proposedDebt]);

  const hasInputs =
    parseCurrency(revenue) > 0 &&
    parseCurrency(expenses) >= 0 &&
    (parseCurrency(existingDebt) > 0 || parseCurrency(proposedDebt) > 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header badge */}
      <div className="flex justify-center pt-6 pb-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Business Eligibility
        </span>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-4">
        {/* Title */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            DSCR Calculator
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Calculate your Debt Service Coverage Ratio to see if your business
            qualifies for financing.
          </p>
        </div>

        {/* Input form */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 sm:p-8 space-y-5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CurrencyInput
              label="Annual Gross Revenue"
              value={revenue}
              onChange={setRevenue}
              placeholder="500,000"
            />
            <CurrencyInput
              label="Annual Operating Expenses"
              value={expenses}
              onChange={setExpenses}
              placeholder="350,000"
            />
            <CurrencyInput
              label="Annual Existing Debt Payments"
              value={existingDebt}
              onChange={setExistingDebt}
              placeholder="40,000"
            />
            <CurrencyInput
              label="Proposed New Debt Payments"
              value={proposedDebt}
              onChange={setProposedDebt}
              placeholder="24,000"
            />
          </div>

          <button
            onClick={calculate}
            disabled={!hasInputs}
            className="w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-500"
          >
            Calculate DSCR
          </button>

          {/* Formula hint */}
          <p className="text-center text-xs text-slate-600 font-mono">
            DSCR = (Revenue − Expenses) ÷ (Existing Debt + New Debt)
          </p>
        </div>

        {/* Results */}
        {result && showResult && (
          <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            {/* Score display */}
            <div className="text-center space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Your DSCR Score
              </p>
              <AnimatedScore target={result.dscr} />
              <div className="flex justify-center">
                <span
                  className="inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    color: scoreColor(result.dscr),
                    background: `${scoreColor(result.dscr)}20`,
                  }}
                >
                  {scoreLabel(result.dscr)}
                </span>
              </div>
            </div>

            {/* Gauge */}
            <GaugeBar dscr={result.dscr} />

            {/* Breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <BreakdownCard
                title="Net Operating Income"
                value={formatCurrency(result.noi)}
                subtitle="Revenue minus expenses"
                accent={result.noi >= 0 ? "#34d399" : "#f87171"}
              />
              <BreakdownCard
                title="Total Annual Debt"
                value={formatCurrency(result.totalDebt)}
                subtitle="Existing plus proposed"
                accent="#fb923c"
              />
              <BreakdownCard
                title={
                  result.monthlySurplus >= 0
                    ? "Monthly Surplus"
                    : "Monthly Deficit"
                }
                value={formatCurrency(Math.abs(result.monthlySurplus))}
                subtitle={
                  result.monthlySurplus >= 0
                    ? "After all debt payments"
                    : "Shortfall each month"
                }
                accent={result.monthlySurplus >= 0 ? "#34d399" : "#f87171"}
              />
            </div>

            {/* Analysis */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-3">
              <h2 className="text-lg font-semibold text-white">
                What This Means
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                {getAnalysis(result.dscr)}
              </p>
            </div>

            {/* Action items */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Recommended Actions
              </h2>
              <ol className="space-y-3">
                {getActionItems(result.dscr).map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span
                      className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold font-mono"
                      style={{
                        color: scoreColor(result.dscr),
                        background: `${scoreColor(result.dscr)}20`,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-slate-300 leading-relaxed pt-0.5">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Lender threshold table */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Lender Threshold Comparison
              </h2>
              <LenderTable dscr={result.dscr} />
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
          </span>{" "}
          — Know exactly where you stand with lenders
        </p>
      </footer>

    </div>
  );
}
