"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

/* ------------------------------------------------------------------ */
/*  Dimension definitions                                              */
/* ------------------------------------------------------------------ */

interface PillOption {
  label: string;
  score: number;
}

interface PillField {
  type: "pill";
  id: string;
  label: string;
  options: PillOption[];
}

interface CurrencyField {
  type: "currency";
  id: string;
  label: string;
}

interface DisplayField {
  type: "display";
  id: string;
  label: string;
}

type Field = PillField | CurrencyField | DisplayField;

interface Dimension {
  id: string;
  title: string;
  icon: string;
  weight: number;
  color: string;
  colorHex: string;
  fields: Field[];
}

const DIMENSIONS: Dimension[] = [
  {
    id: "credit",
    title: "Credit Profile",
    icon: "📊",
    weight: 0.25,
    color: "cyan",
    colorHex: "#22d3ee",
    fields: [
      {
        type: "pill",
        id: "creditScore",
        label: "Credit Score Range",
        options: [
          { label: "Below 600", score: 10 },
          { label: "600–649", score: 30 },
          { label: "650–679", score: 55 },
          { label: "680–719", score: 75 },
          { label: "720+", score: 95 },
        ],
      },
      {
        type: "pill",
        id: "utilization",
        label: "Credit Utilization",
        options: [
          { label: "Over 75%", score: 10 },
          { label: "50–75%", score: 30 },
          { label: "30–50%", score: 55 },
          { label: "10–30%", score: 80 },
          { label: "Under 10%", score: 95 },
        ],
      },
      {
        type: "pill",
        id: "tradelines",
        label: "Open Tradelines",
        options: [
          { label: "0", score: 10 },
          { label: "1–2", score: 35 },
          { label: "3–5", score: 65 },
          { label: "6–10", score: 85 },
          { label: "10+", score: 95 },
        ],
      },
      {
        type: "pill",
        id: "inquiries",
        label: "Hard Inquiries (Past 12mo)",
        options: [
          { label: "0", score: 95 },
          { label: "1", score: 80 },
          { label: "2", score: 60 },
          { label: "3", score: 35 },
          { label: "4+", score: 15 },
        ],
      },
      {
        type: "pill",
        id: "derogatoryMarks",
        label: "Derogatory Marks",
        options: [
          { label: "0", score: 95 },
          { label: "1", score: 50 },
          { label: "2", score: 25 },
          { label: "3+", score: 5 },
        ],
      },
    ],
  },
  {
    id: "cashFlow",
    title: "Cash Flow",
    icon: "💵",
    weight: 0.25,
    color: "emerald",
    colorHex: "#34d399",
    fields: [
      { type: "currency", id: "monthlyRevenue", label: "Monthly Revenue" },
      { type: "currency", id: "monthlyExpenses", label: "Monthly Expenses" },
      {
        type: "pill",
        id: "revenueTrend",
        label: "Revenue Trend",
        options: [
          { label: "Growing", score: 95 },
          { label: "Stable", score: 70 },
          { label: "Declining", score: 30 },
          { label: "Volatile", score: 20 },
        ],
      },
      {
        type: "pill",
        id: "monthsOperating",
        label: "Months Operating",
        options: [
          { label: "Under 6 months", score: 15 },
          { label: "6–12 months", score: 35 },
          { label: "1–2 years", score: 55 },
          { label: "2–5 years", score: 80 },
          { label: "5+ years", score: 95 },
        ],
      },
    ],
  },
  {
    id: "debtService",
    title: "Debt Service",
    icon: "⚖️",
    weight: 0.2,
    color: "yellow",
    colorHex: "#facc15",
    fields: [
      {
        type: "currency",
        id: "existingAnnualDebt",
        label: "Existing Annual Debt Payments",
      },
      {
        type: "currency",
        id: "proposedAnnualDebt",
        label: "Proposed New Annual Debt Payments",
      },
      { type: "display", id: "dscrDisplay", label: "Calculated DSCR" },
    ],
  },
  {
    id: "entity",
    title: "Entity",
    icon: "🏢",
    weight: 0.1,
    color: "orange",
    colorHex: "#fb923c",
    fields: [
      {
        type: "pill",
        id: "entityType",
        label: "Entity Type",
        options: [
          { label: "Sole Proprietorship", score: 30 },
          { label: "LLC", score: 70 },
          { label: "S-Corp", score: 85 },
          { label: "C-Corp", score: 90 },
          { label: "Partnership", score: 55 },
        ],
      },
      {
        type: "pill",
        id: "goodStanding",
        label: "State Good Standing",
        options: [
          { label: "Yes", score: 95 },
          { label: "No", score: 15 },
          { label: "Not sure", score: 40 },
        ],
      },
      {
        type: "pill",
        id: "separateAccount",
        label: "Separate Business Bank Account",
        options: [
          { label: "Yes", score: 90 },
          { label: "No", score: 20 },
        ],
      },
      {
        type: "pill",
        id: "businessInsurance",
        label: "Business Insurance",
        options: [
          { label: "Yes", score: 85 },
          { label: "No", score: 25 },
        ],
      },
    ],
  },
  {
    id: "tax",
    title: "Tax Positioning",
    icon: "📄",
    weight: 0.1,
    color: "purple",
    colorHex: "#a78bfa",
    fields: [
      {
        type: "pill",
        id: "netIncome",
        label: "Net Income on Returns",
        options: [
          { label: "Strong positive", score: 95 },
          { label: "Modest positive", score: 70 },
          { label: "Breakeven", score: 40 },
          { label: "Small loss", score: 20 },
          { label: "Significant loss", score: 5 },
        ],
      },
      {
        type: "pill",
        id: "officerComp",
        label: "Officer Compensation Line",
        options: [
          { label: "Own line", score: 90 },
          { label: "Mixed in Salaries", score: 50 },
          { label: "Not listed", score: 15 },
        ],
      },
      {
        type: "pill",
        id: "addbacks",
        label: "Addbacks Correct",
        options: [
          { label: "All correct", score: 95 },
          { label: "Partial", score: 55 },
          { label: "None", score: 20 },
          { label: "Unsure", score: 30 },
        ],
      },
      {
        type: "pill",
        id: "filingBasis",
        label: "Filing Basis",
        options: [
          { label: "Accrual", score: 85 },
          { label: "Cash", score: 70 },
          { label: "Unsure", score: 30 },
        ],
      },
    ],
  },
  {
    id: "banking",
    title: "Banking",
    icon: "🏦",
    weight: 0.1,
    color: "rose",
    colorHex: "#fb7185",
    fields: [
      {
        type: "pill",
        id: "accountTenure",
        label: "Account Tenure",
        options: [
          { label: "Under 6 months", score: 15 },
          { label: "6–12 months", score: 35 },
          { label: "1–2 years", score: 55 },
          { label: "2–5 years", score: 80 },
          { label: "5+ years", score: 95 },
        ],
      },
      {
        type: "pill",
        id: "avgDailyBalance",
        label: "Average Daily Balance",
        options: [
          { label: "Under $5K", score: 15 },
          { label: "$5K–$15K", score: 35 },
          { label: "$15K–$50K", score: 60 },
          { label: "$50K–$100K", score: 80 },
          { label: "$100K+", score: 95 },
        ],
      },
      {
        type: "pill",
        id: "overdrafts",
        label: "Overdrafts (Past 12mo)",
        options: [
          { label: "0", score: 95 },
          { label: "1–2", score: 50 },
          { label: "3+", score: 10 },
        ],
      },
      {
        type: "pill",
        id: "depositConsistency",
        label: "Deposit Consistency",
        options: [
          { label: "Consistent", score: 95 },
          { label: "Mostly consistent", score: 65 },
          { label: "Irregular", score: 20 },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Scoring                                                            */
/* ------------------------------------------------------------------ */

function computeDimensionScore(
  dim: Dimension,
  values: Record<string, number | string>
): number {
  const pillFields = dim.fields.filter((f) => f.type === "pill") as PillField[];
  if (pillFields.length === 0) return 0;

  // Special handling for cash flow dimension — include margin calc
  if (dim.id === "cashFlow") {
    const rev = parseCurrency(String(values.monthlyRevenue ?? ""));
    const exp = parseCurrency(String(values.monthlyExpenses ?? ""));
    const margin = rev > 0 ? ((rev - exp) / rev) * 100 : 0;
    let marginScore = 0;
    if (margin >= 30) marginScore = 95;
    else if (margin >= 20) marginScore = 75;
    else if (margin >= 10) marginScore = 50;
    else if (margin >= 0) marginScore = 25;
    else marginScore = 5;

    const pillScores = pillFields.map((f) => Number(values[f.id]) || 0);
    const allScores = [...pillScores, marginScore];
    return Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
  }

  // Special handling for debt service dimension — include DSCR calc
  if (dim.id === "debtService") {
    const rev = parseCurrency(String(values.monthlyRevenue ?? ""));
    const exp = parseCurrency(String(values.monthlyExpenses ?? ""));
    const noi = (rev - exp) * 12;
    const existingDebt = parseCurrency(String(values.existingAnnualDebt ?? ""));
    const proposedDebt = parseCurrency(String(values.proposedAnnualDebt ?? ""));
    const totalDebt = existingDebt + proposedDebt;
    const dscr = totalDebt > 0 ? noi / totalDebt : 0;

    let dscrScore = 0;
    if (dscr >= 1.5) dscrScore = 95;
    else if (dscr >= 1.25) dscrScore = 80;
    else if (dscr >= 1.15) dscrScore = 60;
    else if (dscr >= 1.0) dscrScore = 40;
    else if (dscr > 0) dscrScore = 15;
    else dscrScore = 0;

    return dscrScore;
  }

  const scores = pillFields
    .map((f) => Number(values[f.id]) || 0)
    .filter((s) => s > 0);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function computeOverall(dimScores: Record<string, number>): number {
  let total = 0;
  for (const dim of DIMENSIONS) {
    total += (dimScores[dim.id] ?? 0) * dim.weight;
  }
  return Math.round(total);
}

function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B+";
  if (score >= 70) return "B";
  if (score >= 60) return "C+";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Bank Ready";
  if (score >= 70) return "Strong Position";
  if (score >= 55) return "Needs Improvement";
  if (score >= 40) return "Significant Gaps";
  return "Not Bank Ready";
}

function gradeColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-cyan-400";
  if (score >= 55) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function gradeBg(score: number): string {
  if (score >= 85) return "bg-emerald-500/20 border-emerald-500/40 text-emerald-400";
  if (score >= 70) return "bg-cyan-500/20 border-cyan-500/40 text-cyan-400";
  if (score >= 55) return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
  if (score >= 40) return "bg-orange-500/20 border-orange-500/40 text-orange-400";
  return "bg-red-500/20 border-red-500/40 text-red-400";
}

function barGradient(score: number): string {
  if (score >= 85) return "from-emerald-500 to-emerald-400";
  if (score >= 70) return "from-cyan-500 to-cyan-400";
  if (score >= 55) return "from-yellow-500 to-yellow-400";
  if (score >= 40) return "from-orange-500 to-orange-400";
  return "from-red-500 to-red-400";
}

const IMPROVEMENT_TIPS: Record<string, string> = {
  credit:
    "Pay down revolving balances below 30%, dispute credit errors, and avoid new hard inquiries for 6 months before applying.",
  cashFlow:
    "Increase monthly revenue or reduce expenses to show consistent profitability. Build 3+ months of positive trend.",
  debtService:
    "Pay down existing debt or increase net operating income to achieve a DSCR of 1.25x or higher.",
  entity:
    "Form an LLC or S-Corp, ensure good standing with the state, separate personal and business finances.",
  tax:
    "Work with a CPA to show positive net income, properly classify officer comp, and document addbacks.",
  banking:
    "Maintain consistent deposits, avoid overdrafts, and build account tenure with your primary bank.",
};

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */

function AnimatedScore({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const start = animRef.current;
    const end = value;
    const duration = 1200;
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.round(start + (end - start) * eased);
      if (ref.current) ref.current.textContent = String(cur);
      animRef.current = cur;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Radar chart SVG                                                    */
/* ------------------------------------------------------------------ */

function RadarChart({
  dimScores,
}: {
  dimScores: Record<string, number>;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const levels = 5;

  const angle = (i: number) =>
    (Math.PI * 2 * i) / DIMENSIONS.length - Math.PI / 2;

  const point = (i: number, val: number) => {
    const a = angle(i);
    const dist = (val / 100) * r;
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)];
  };

  // Score polygon
  const scorePoints = DIMENSIONS.map((d, i) =>
    point(i, dimScores[d.id] ?? 0)
  );
  const scorePath =
    scorePoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z";

  // Threshold line at 70%
  const threshPoints = DIMENSIONS.map((_, i) => point(i, 70));
  const threshPath =
    threshPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {/* Grid levels */}
      {Array.from({ length: levels }).map((_, li) => {
        const lvl = ((li + 1) / levels) * 100;
        const pts = DIMENSIONS.map((_, i) => point(i, lvl));
        const d =
          pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + " Z";
        return <path key={li} d={d} fill="none" stroke="#334155" strokeWidth={0.5} />;
      })}
      {/* Axis lines */}
      {DIMENSIONS.map((_, i) => {
        const [ex, ey] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="#334155" strokeWidth={0.5} />;
      })}
      {/* 70% threshold */}
      <path d={threshPath} fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      {/* Score fill */}
      <path d={scorePath} fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth={2} />
      {/* Dots */}
      {DIMENSIONS.map((dim, i) => {
        const [px, py] = point(i, dimScores[dim.id] ?? 0);
        return <circle key={dim.id} cx={px} cy={py} r={4} fill={dim.colorHex} />;
      })}
      {/* Labels */}
      {DIMENSIONS.map((dim, i) => {
        const [lx, ly] = point(i, 125);
        return (
          <text
            key={dim.id}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize={9}
            fontFamily="var(--font-dm-sans), sans-serif"
          >
            {dim.title}
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Currency input component                                           */
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
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function BankabilityScore() {
  const [activeTab, setActiveTab] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const setValue = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  // Compute DSCR for display
  const monthlyRev = parseCurrency(values.monthlyRevenue ?? "");
  const monthlyExp = parseCurrency(values.monthlyExpenses ?? "");
  const noi = (monthlyRev - monthlyExp) * 12;
  const existDebt = parseCurrency(values.existingAnnualDebt ?? "");
  const propDebt = parseCurrency(values.proposedAnnualDebt ?? "");
  const totalDebt = existDebt + propDebt;
  const dscr = totalDebt > 0 ? noi / totalDebt : 0;

  // Dimension scores
  const dimScores: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    dimScores[dim.id] = computeDimensionScore(dim, values);
  }
  const overall = computeOverall(dimScores);

  const handleCalculate = useCallback(() => {
    setShowResults(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }, []);

  const handleReset = useCallback(() => {
    setValues({});
    setShowResults(false);
    setActiveTab(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Improvement roadmap: dimensions below 80, sorted by weighted impact potential
  const roadmap = DIMENSIONS.filter((d) => dimScores[d.id] < 80)
    .map((d) => ({
      dim: d,
      score: dimScores[d.id],
      potentialGain: Math.round((80 - dimScores[d.id]) * d.weight),
    }))
    .sort((a, b) => b.potentialGain - a.potentialGain);

  const distanceTo70 = 70 - overall;

  /* ----- Render ----- */

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
            Bankability Score
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Your comprehensive funding readiness score across all 6 dimensions
            banks evaluate.
          </p>
        </div>

        {!showResults && (
          <div className="animate-[fadeIn_0.4s_ease-out]">
            {/* Tab navigation */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
              {DIMENSIONS.map((dim, i) => (
                <button
                  key={dim.id}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                    activeTab === i
                      ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-400"
                      : "bg-slate-900/50 border border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  <span className="text-sm">{dim.icon}</span>
                  <span className="hidden sm:inline">{dim.title}</span>
                  <span className="sm:hidden">{dim.title.split(" ")[0]}</span>
                  <span className="text-[10px] font-mono opacity-60">
                    {Math.round(dim.weight * 100)}%
                  </span>
                </button>
              ))}
            </div>

            {/* Active section */}
            {DIMENSIONS.map((dim, i) =>
              activeTab !== i ? null : (
                <div
                  key={dim.id}
                  className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-6 animate-[fadeUp_0.3s_ease-out]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{dim.icon}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {dim.title}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono">
                        {Math.round(dim.weight * 100)}% of overall score
                      </p>
                    </div>
                  </div>

                  {dim.fields.map((field) => {
                    if (field.type === "pill") {
                      const selected = values[field.id];
                      return (
                        <div key={field.id} className="space-y-2">
                          <label className="text-sm font-medium text-slate-400">
                            {field.label}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {field.options.map((opt) => (
                              <button
                                key={opt.label}
                                onClick={() =>
                                  setValue(field.id, String(opt.score))
                                }
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                  selected === String(opt.score)
                                    ? "bg-cyan-500/15 border border-cyan-500/50 text-cyan-400"
                                    : "bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    if (field.type === "currency") {
                      return (
                        <CurrencyInput
                          key={field.id}
                          label={field.label}
                          value={values[field.id] ?? ""}
                          onChange={(v) => setValue(field.id, v)}
                        />
                      );
                    }
                    if (field.type === "display") {
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-400">
                            {field.label}
                          </label>
                          <div className="rounded-xl border border-slate-700 bg-slate-800/30 py-3 px-4 font-mono text-lg">
                            {totalDebt > 0 ? (
                              <span
                                className={
                                  dscr >= 1.25
                                    ? "text-emerald-400"
                                    : dscr >= 1.0
                                    ? "text-yellow-400"
                                    : "text-red-400"
                                }
                              >
                                {dscr.toFixed(2)}x
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                Enter revenue, expenses & debt above
                              </span>
                            )}
                          </div>
                          {totalDebt > 0 && (
                            <p className="text-xs text-slate-500">
                              NOI: $
                              {noi.toLocaleString()} ÷ Total Debt: $
                              {totalDebt.toLocaleString()}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveTab((t) => Math.max(0, t - 1))}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        i === 0
                          ? "text-slate-700 cursor-default"
                          : "text-slate-400 hover:text-white"
                      }`}
                      disabled={i === 0}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Previous
                    </button>

                    {i < DIMENSIONS.length - 1 ? (
                      <button
                        onClick={() =>
                          setActiveTab((t) =>
                            Math.min(DIMENSIONS.length - 1, t + 1)
                          )
                        }
                        className="flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Next
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={handleCalculate}
                        className="rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 active:scale-[0.98] transition-all"
                      >
                        Calculate Bankability Score
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ---------- RESULTS ---------- */}
        {showResults && (
          <div className="animate-[fadeUp_0.5s_ease-out] space-y-8">
            {/* Top two-column: Score + Radar */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Left: Overall score */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Bankability Score
                </p>
                <span
                  className={`text-6xl font-bold font-mono ${gradeColor(overall)}`}
                >
                  <AnimatedScore value={overall} />
                </span>
                <span
                  className={`text-2xl font-bold border rounded-xl px-4 py-1.5 ${gradeBg(overall)}`}
                >
                  {letterGrade(overall)}
                </span>
                <p className={`text-sm font-semibold ${gradeColor(overall)}`}>
                  {scoreLabel(overall)}
                </p>
              </div>

              {/* Right: Radar chart */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 flex items-center justify-center">
                <RadarChart dimScores={dimScores} />
              </div>
            </div>

            {/* Dimension cards 3x2 grid */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                Dimension Breakdown
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {DIMENSIONS.map((dim) => {
                  const s = dimScores[dim.id];
                  return (
                    <div
                      key={dim.id}
                      className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{dim.icon}</span>
                          <span className="text-sm font-semibold text-white">
                            {dim.title}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold border rounded-lg px-2 py-0.5 ${gradeBg(s)}`}
                        >
                          {letterGrade(s)}
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span
                          className={`text-2xl font-bold font-mono ${gradeColor(s)}`}
                        >
                          {s}
                        </span>
                        <span className="text-sm text-slate-500 mb-0.5">
                          / 100
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGradient(s)} transition-all duration-700`}
                          style={{ width: `${s}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Improvement Roadmap */}
            {roadmap.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">
                  Priority Improvement Roadmap
                </h2>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4">
                  {roadmap.map((item, idx) => (
                    <div key={item.dim.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: item.dim.colorHex + "33" }}
                        >
                          {idx + 1}
                        </span>
                        {idx < roadmap.length - 1 && (
                          <div className="w-px flex-1 bg-slate-700/50 mt-1" />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-white">
                            {item.dim.icon} {item.dim.title}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {item.score}/100 →{" "}
                            <span className="text-cyan-400">
                              +{item.potentialGain} pts
                            </span>{" "}
                            potential
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {IMPROVEMENT_TIPS[item.dim.id]}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distance to Bankable */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                Distance to Bankable
              </h2>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4">
                <div className="relative">
                  <div className="h-4 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient(overall)} transition-all duration-1000`}
                      style={{ width: `${overall}%` }}
                    />
                  </div>
                  {/* 70% threshold marker */}
                  <div
                    className="absolute top-0 h-4 w-0.5 bg-white/80"
                    style={{ left: "70%" }}
                  />
                  <div
                    className="absolute -top-5 text-[10px] font-mono text-slate-400 -translate-x-1/2"
                    style={{ left: "70%" }}
                  >
                    70 — Bankable
                  </div>
                </div>
                <p className="text-sm text-center">
                  {distanceTo70 > 0 ? (
                    <span className="text-slate-400">
                      You need{" "}
                      <span className="text-white font-semibold font-mono">
                        {distanceTo70} more points
                      </span>{" "}
                      to reach the bankable threshold.
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">
                      Congratulations! You&rsquo;re above the bankable
                      threshold.
                    </span>
                  )}
                </p>
              </div>
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

            {/* Start Over */}
            <div className="text-center">
              <button
                onClick={handleReset}
                className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-all"
              >
                Start Over
              </button>
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
