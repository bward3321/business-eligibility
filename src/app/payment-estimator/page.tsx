"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════
   TYPES & DATA
   ═══════════════════════════════════════════════════ */

type LoanTypeId =
  | "sba7a"
  | "sba504"
  | "bankTerm"
  | "equipment"
  | "loc"
  | "mca";

type PaymentFrequency = "monthly" | "weekly" | "daily";

interface LoanType {
  id: LoanTypeId;
  name: string;
  icon: string;
  description: string;
  rateRange: [number, number];
  termRange: [number, number]; // months
  defaultRate: number;
  defaultTerm: number; // months
  isMCA?: boolean;
}

const LOAN_TYPES: LoanType[] = [
  {
    id: "sba7a",
    name: "SBA 7(a)",
    icon: "🏛️",
    description: "Government-backed small business loans with competitive rates",
    rateRange: [10.5, 13.5],
    termRange: [60, 300],
    defaultRate: 11.5,
    defaultTerm: 120,
  },
  {
    id: "sba504",
    name: "SBA 504",
    icon: "🏗️",
    description: "Fixed-asset financing for real estate and major equipment",
    rateRange: [5.5, 7.5],
    termRange: [120, 300],
    defaultRate: 6.5,
    defaultTerm: 240,
  },
  {
    id: "bankTerm",
    name: "Bank Term Loan",
    icon: "🏦",
    description: "Traditional term loans from banks and credit unions",
    rateRange: [7, 12],
    termRange: [36, 120],
    defaultRate: 9,
    defaultTerm: 60,
  },
  {
    id: "equipment",
    name: "Equipment Financing",
    icon: "⚙️",
    description: "Loans secured by the equipment being purchased",
    rateRange: [6, 14],
    termRange: [24, 84],
    defaultRate: 9,
    defaultTerm: 60,
  },
  {
    id: "loc",
    name: "Line of Credit",
    icon: "💳",
    description: "Revolving credit lines for working capital needs",
    rateRange: [8, 24],
    termRange: [12, 60],
    defaultRate: 14,
    defaultTerm: 36,
  },
  {
    id: "mca",
    name: "MCA Compare Mode",
    icon: "⚠️",
    description: "Merchant cash advances — see true cost vs traditional loans",
    rateRange: [20, 80],
    termRange: [3, 18],
    defaultRate: 40,
    defaultTerm: 12,
    isMCA: true,
  },
];

interface CalcResult {
  monthlyPayment: number;
  weeklyPayment: number;
  dailyPayment: number;
  totalInterest: number;
  totalCost: number;
  effectiveAPR: number;
  schedule: AmortRow[];
  principalCrossoverMonth: number | null;
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatCurrencyCents(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function parseCurrencyInput(raw: string): number {
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

function toCurrencyDisplay(raw: string): string {
  const n = parseCurrencyInput(raw);
  if (n === 0 && raw === "") return "";
  return n.toLocaleString("en-US");
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function monthsToLabel(m: number): string {
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return `${rem} mo`;
  if (rem === 0) return `${y} yr${y > 1 ? "s" : ""}`;
  return `${y} yr${y > 1 ? "s" : ""} ${rem} mo`;
}

/* ─── calculations ─── */

function calcStandardAmort(
  principal: number,
  annualRate: number,
  months: number
): CalcResult {
  const r = annualRate / 100 / 12;
  let monthlyPayment: number;
  if (r === 0) {
    monthlyPayment = principal / months;
  } else {
    monthlyPayment =
      (principal * (r * Math.pow(1 + r, months))) /
      (Math.pow(1 + r, months) - 1);
  }

  const schedule: AmortRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let principalCrossoverMonth: number | null = null;

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const princ = monthlyPayment - interest;
    balance = Math.max(balance - princ, 0);
    totalInterest += interest;
    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal: princ,
      interest,
      balance,
    });
    if (principalCrossoverMonth === null && princ > interest) {
      principalCrossoverMonth = i;
    }
  }

  const totalCost = principal + totalInterest;

  return {
    monthlyPayment,
    weeklyPayment: (monthlyPayment * 12) / 52,
    dailyPayment: (monthlyPayment * 12) / 365,
    totalInterest,
    totalCost,
    effectiveAPR: annualRate,
    schedule,
    principalCrossoverMonth,
  };
}

function calcMCA(
  principal: number,
  factorRatePercent: number,
  months: number
): CalcResult {
  const totalCost = principal * (1 + factorRatePercent / 100);
  const totalInterest = totalCost - principal;
  const monthlyPayment = totalCost / months;

  // effective APR approximation
  const totalFees = totalInterest;
  const avgBalance = principal / 2;
  const years = months / 12;
  const effectiveAPR = (totalFees / avgBalance / years) * 100;

  const schedule: AmortRow[] = [];
  let balance = totalCost;
  const perMonth = totalCost / months;

  for (let i = 1; i <= months; i++) {
    const interestPortion = totalInterest / months;
    const principalPortion = perMonth - interestPortion;
    balance = Math.max(balance - perMonth, 0);
    schedule.push({
      month: i,
      payment: perMonth,
      principal: principalPortion,
      interest: interestPortion,
      balance,
    });
  }

  return {
    monthlyPayment,
    weeklyPayment: (monthlyPayment * 12) / 52,
    dailyPayment: (monthlyPayment * 12) / 365,
    totalInterest,
    totalCost,
    effectiveAPR,
    schedule,
    principalCrossoverMonth: null,
  };
}

function calcSBAComparison(principal: number): CalcResult {
  return calcStandardAmort(principal, 11.5, 120);
}

/* ═══════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════ */

/* ─── Loan Type Card ─── */
function LoanTypeCard({
  loan,
  selected,
  onSelect,
}: {
  loan: LoanType;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
        selected
          ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
          : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
      }`}
    >
      <div className="text-2xl mb-2">{loan.icon}</div>
      <h3
        className={`font-semibold text-sm mb-1 ${
          selected ? "text-cyan-400" : "text-slate-200"
        }`}
      >
        {loan.name}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-2">
        {loan.description}
      </p>
      <p className="text-xs font-mono text-slate-400">
        {loan.rateRange[0]}–{loan.rateRange[1]}%{" "}
        {loan.isMCA ? "factor" : "APR"}
      </p>
    </button>
  );
}

/* ─── Slider + Input combo ─── */
function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-400">{label}</label>
        {hint && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              hint === "within typical range"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-orange-400/15 text-orange-400"
            }`}
          >
            {hint}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-cyan-500 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
        />
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v)) onChange(clamp(v, min, max));
            }}
            className="w-20 rounded-lg border border-slate-700 bg-slate-800/50 py-2 px-2.5 text-right font-mono text-sm text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          <span className="text-xs text-slate-500 w-8">{suffix}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Animated payment count-up ─── */
function AnimatedPayment({
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
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
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
    <span className="font-mono text-5xl sm:text-6xl font-bold tabular-nums text-cyan-400">
      {formatCurrencyCents(display)}
    </span>
  );
}

/* ─── Breakdown card ─── */
function BreakdownCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 sm:p-5 space-y-1">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p
        className="text-lg sm:text-2xl font-bold font-mono"
        style={{ color: accent }}
      >
        {value}
      </p>
      {subtitle && <p className="text-[10px] sm:text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

/* ─── Balance Chart (pure CSS bars) ─── */
function BalanceChart({ schedule }: { schedule: AmortRow[] }) {
  if (schedule.length === 0) return null;

  // Sample ~20 bars max
  const step = Math.max(1, Math.floor(schedule.length / 20));
  const samples = schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1);
  const maxBalance = schedule[0].balance + schedule[0].principal;

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Balance Over Time</h2>
      <div className="flex items-end gap-[3px] sm:gap-1 h-40">
        {samples.map((row) => {
          const heightPct = (row.balance / maxBalance) * 100;
          const principalRatio = row.principal / (row.principal + row.interest);
          const opacity = 0.4 + principalRatio * 0.6;
          return (
            <div
              key={row.month}
              className="flex-1 rounded-t transition-all duration-500 relative group"
              style={{
                height: `${Math.max(heightPct, 1)}%`,
                background: `rgba(79, 195, 247, ${opacity})`,
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap text-[9px] font-mono text-slate-300 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 z-10">
                Mo {row.month}: {formatCurrency(row.balance)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-slate-600">
        <span>Month 1</span>
        <span>Month {schedule.length}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: "rgba(79,195,247,0.4)" }}
          />
          More interest
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: "rgba(79,195,247,1)" }}
          />
          More principal
        </span>
      </div>
    </div>
  );
}

/* ─── Amortization Table ─── */
function AmortizationTable({ schedule }: { schedule: AmortRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? schedule : schedule.slice(0, 12);

  return (
    <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/50">
              <th className="px-3 sm:px-4 py-3 font-semibold text-slate-300">
                Month
              </th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-slate-300 text-right">
                Payment
              </th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-emerald-400 text-right">
                Principal
              </th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-orange-400 text-right">
                Interest
              </th>
              <th className="px-3 sm:px-4 py-3 font-semibold text-slate-300 text-right">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className={`border-b border-slate-700/20 ${
                  row.month % 2 === 0 ? "bg-slate-800/20" : ""
                }`}
              >
                <td className="px-3 sm:px-4 py-2.5 font-mono text-slate-400">
                  {row.month}
                </td>
                <td className="px-3 sm:px-4 py-2.5 font-mono text-slate-200 text-right">
                  {formatCurrencyCents(row.payment)}
                </td>
                <td className="px-3 sm:px-4 py-2.5 font-mono text-emerald-400 text-right">
                  {formatCurrencyCents(row.principal)}
                </td>
                <td className="px-3 sm:px-4 py-2.5 font-mono text-orange-400 text-right">
                  {formatCurrencyCents(row.interest)}
                </td>
                <td className="px-3 sm:px-4 py-2.5 font-mono text-slate-200 text-right">
                  {formatCurrencyCents(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedule.length > 12 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-xs font-semibold text-cyan-400 hover:bg-slate-800/30 transition-colors border-t border-slate-700/30"
        >
          {expanded
            ? "Show First 12 Months"
            : `Show All ${schedule.length} Months`}
        </button>
      )}
    </div>
  );
}

/* ─── Comparison Panel ─── */
function ComparisonPanel({
  currentLoan,
  result,
  principal,
}: {
  currentLoan: LoanType;
  result: CalcResult;
  principal: number;
}) {
  const [open, setOpen] = useState(false);
  const [compareId, setCompareId] = useState<LoanTypeId | null>(null);

  const otherLoans = LOAN_TYPES.filter((l) => l.id !== currentLoan.id);
  const compareLoan = compareId
    ? LOAN_TYPES.find((l) => l.id === compareId)!
    : null;

  const compareResult =
    compareLoan && principal > 0
      ? compareLoan.isMCA
        ? calcMCA(principal, compareLoan.defaultRate, compareLoan.defaultTerm)
        : calcStandardAmort(
            principal,
            compareLoan.defaultRate,
            compareLoan.defaultTerm
          )
      : null;

  const savings = compareResult
    ? result.totalCost - compareResult.totalCost
    : 0;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-2xl border border-slate-700/50 bg-slate-900/50 py-4 px-6 text-sm font-semibold text-cyan-400 hover:border-cyan-500/30 transition-all flex items-center justify-center gap-2"
      >
        {open ? "Hide Comparison" : "Compare Against Another Loan Type"}
        <span
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-5 animate-[fadeIn_0.3s_ease-out]">
          {/* Loan type pills */}
          <div className="flex flex-wrap gap-2">
            {otherLoans.map((l) => (
              <button
                key={l.id}
                onClick={() => setCompareId(l.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  compareId === l.id
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-slate-600"
                }`}
              >
                {l.icon} {l.name}
              </button>
            ))}
          </div>

          {compareResult && compareLoan && (
            <div className="space-y-4">
              {/* Side by side */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Current */}
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    {currentLoan.icon} {currentLoan.name}
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment</span>
                      <span className="font-mono text-slate-200">
                        {formatCurrencyCents(result.monthlyPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rate</span>
                      <span className="font-mono text-slate-200">
                        {result.effectiveAPR.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Interest</span>
                      <span className="font-mono text-slate-200">
                        {formatCurrency(result.totalInterest)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Cost</span>
                      <span className="font-mono text-white font-semibold">
                        {formatCurrency(result.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Comparison */}
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {compareLoan.icon} {compareLoan.name}
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment</span>
                      <span className="font-mono text-slate-200">
                        {formatCurrencyCents(compareResult.monthlyPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rate</span>
                      <span className="font-mono text-slate-200">
                        {compareLoan.defaultRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Interest</span>
                      <span className="font-mono text-slate-200">
                        {formatCurrency(compareResult.totalInterest)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Cost</span>
                      <span className="font-mono text-white font-semibold">
                        {formatCurrency(compareResult.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings banner */}
              <div
                className={`rounded-xl p-3 text-center text-sm font-semibold ${
                  savings > 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : savings < 0
                    ? "bg-red-500/15 text-red-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {savings > 0
                  ? `You save ${formatCurrency(savings)} with ${compareLoan.name}`
                  : savings < 0
                  ? `${currentLoan.name} saves you ${formatCurrency(Math.abs(savings))} vs ${compareLoan.name}`
                  : "Both options cost the same"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export default function PaymentEstimator() {
  /* state */
  const [selectedType, setSelectedType] = useState<LoanTypeId>("sba7a");
  const [loanAmountRaw, setLoanAmountRaw] = useState("250,000");
  const [rate, setRate] = useState(11.5);
  const [term, setTerm] = useState(120);
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const currentLoan = LOAN_TYPES.find((l) => l.id === selectedType)!;
  const principal = parseCurrencyInput(loanAmountRaw);

  /* select loan type → auto-populate */
  const handleSelectType = useCallback(
    (id: LoanTypeId) => {
      const lt = LOAN_TYPES.find((l) => l.id === id)!;
      setSelectedType(id);
      setRate(lt.defaultRate);
      setTerm(lt.defaultTerm);
      setResult(null);
      setShowResult(false);
    },
    []
  );

  /* rate hint */
  const rateInRange =
    rate >= currentLoan.rateRange[0] && rate <= currentLoan.rateRange[1];

  /* calculate */
  const calculate = useCallback(() => {
    if (principal < 25000) return;
    const res = currentLoan.isMCA
      ? calcMCA(principal, rate, term)
      : calcStandardAmort(principal, rate, term);
    setResult(res);
    setShowResult(false);
    requestAnimationFrame(() => {
      setShowResult(true);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    });
  }, [principal, rate, term, currentLoan]);

  const freqLabel =
    frequency === "monthly" ? "/mo" : frequency === "weekly" ? "/wk" : "/day";
  const displayPayment = result
    ? frequency === "monthly"
      ? result.monthlyPayment
      : frequency === "weekly"
      ? result.weeklyPayment
      : result.dailyPayment
    : 0;

  /* key insights */
  function getInsights(): string[] {
    if (!result) return [];
    const items: string[] = [];
    const interestPct = ((result.totalInterest / principal) * 100).toFixed(1);
    items.push(
      `Total interest of ${formatCurrency(result.totalInterest)} represents ${interestPct}% of your loan amount`
    );

    const costPerDollar = (result.totalCost / principal).toFixed(2);
    items.push(
      `Every dollar borrowed costs you $${costPerDollar} over the life of the loan`
    );

    if (!currentLoan.isMCA && result.principalCrossoverMonth) {
      items.push(
        `Starting at month ${result.principalCrossoverMonth}, more of each payment goes toward principal than interest`
      );
    }

    if (currentLoan.isMCA) {
      const sbaComparison = calcSBAComparison(principal);
      const diff = result.totalInterest - sbaComparison.totalInterest;
      items.push(
        `This MCA costs ${formatCurrency(diff)} more in interest than an equivalent SBA 7(a) loan at 11.5% over 10 years`
      );
    }

    return items;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header badge */}
      <div className="flex justify-center pt-6 pb-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Business Eligibility
        </span>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-4">
        {/* Title */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Business Loan Payment Estimator
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Estimate your monthly payments across different loan types and see
            the true cost of borrowing.
          </p>
        </div>

        {/* ── Loan Type Selector ── */}
        <div className="space-y-4 mb-8">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Select Loan Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LOAN_TYPES.map((lt) => (
              <LoanTypeCard
                key={lt.id}
                loan={lt}
                selected={selectedType === lt.id}
                onSelect={() => handleSelectType(lt.id)}
              />
            ))}
          </div>
        </div>

        {/* MCA warning */}
        {currentLoan.isMCA && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 mb-6 flex gap-3">
            <span className="text-red-400 text-lg shrink-0">⚠️</span>
            <div className="text-sm text-red-300">
              <p className="font-semibold mb-1">Merchant Cash Advance Warning</p>
              <p className="text-red-400/80 text-xs leading-relaxed">
                MCAs use factor rates, not traditional interest. A 40% factor
                rate means you repay $1.40 for every $1 borrowed regardless of
                how quickly you pay it back. The effective APR is typically much
                higher than the stated factor rate.
              </p>
            </div>
          </div>
        )}

        {/* ── Input Form ── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-8 space-y-6 mb-8">
          {/* Loan Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              Loan Amount
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={25000}
                max={2000000}
                step={5000}
                value={principal}
                onChange={(e) =>
                  setLoanAmountRaw(Number(e.target.value).toLocaleString("en-US"))
                }
                className="flex-1 h-1.5 accent-cyan-500 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
              />
              <div className="relative shrink-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={loanAmountRaw}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setLoanAmountRaw(toCurrencyDisplay(raw));
                  }}
                  className="w-32 sm:w-36 rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-8 pr-3 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-600">
              <span>$25K</span>
              <span>$2M</span>
            </div>
          </div>

          {/* Rate */}
          <SliderInput
            label={currentLoan.isMCA ? "Factor Rate" : "Interest Rate (APR)"}
            value={rate}
            min={currentLoan.rateRange[0]}
            max={currentLoan.rateRange[1]}
            step={0.1}
            onChange={setRate}
            suffix="%"
            hint={rateInRange ? "within typical range" : "outside typical range"}
          />

          {/* Term */}
          <div className="space-y-2">
            <SliderInput
              label="Loan Term"
              value={term}
              min={currentLoan.termRange[0]}
              max={currentLoan.termRange[1]}
              step={1}
              onChange={setTerm}
              suffix="mo"
            />
            <p className="text-xs text-slate-600 font-mono pl-1">
              = {monthsToLabel(term)}
            </p>
          </div>

          {/* Payment Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">
              Payment Frequency
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["monthly", "Monthly"],
                  ["weekly", "Weekly"],
                  ["daily", "Daily"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFrequency(val)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    frequency === val
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculate button */}
          <button
            onClick={calculate}
            disabled={principal < 25000}
            className="w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-500"
          >
            Calculate Payment
          </button>
        </div>

        {/* ═══ RESULTS ═══ */}
        {result && showResult && (
          <div
            ref={resultRef}
            className="space-y-8 animate-[fadeIn_0.5s_ease-out]"
          >
            {/* Big payment display */}
            <div className="text-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Estimated Payment
              </p>
              <div className="flex items-baseline justify-center gap-2">
                <AnimatedPayment target={displayPayment} />
                <span className="text-xl font-mono text-slate-500">
                  {freqLabel}
                </span>
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <BreakdownCard
                title="Monthly Payment"
                value={formatCurrencyCents(result.monthlyPayment)}
                accent="#4FC3F7"
              />
              <BreakdownCard
                title="Total Interest"
                value={formatCurrency(result.totalInterest)}
                accent="#fb923c"
              />
              <BreakdownCard
                title="Total Cost"
                value={formatCurrency(result.totalCost)}
                accent="#e2e8f0"
              />
              <BreakdownCard
                title="Effective APR"
                value={`${result.effectiveAPR.toFixed(1)}%`}
                accent={result.effectiveAPR > 20 ? "#f87171" : "#34d399"}
              />
            </div>

            {/* Key Insights */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Key Insights</h2>
              <ol className="space-y-3">
                {getInsights().map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold font-mono bg-cyan-500/15 text-cyan-400">
                      {i + 1}
                    </span>
                    <span className="text-slate-300 leading-relaxed pt-0.5">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Balance Chart */}
            <BalanceChart schedule={result.schedule} />

            {/* Loan Comparison */}
            <ComparisonPanel
              currentLoan={currentLoan}
              result={result}
              principal={principal}
            />

            {/* Amortization Table (hidden for MCA) */}
            {!currentLoan.isMCA && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Amortization Schedule
                </h2>
                <AmortizationTable schedule={result.schedule} />
              </div>
            )}
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

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
