"use client";

import { useState, useMemo } from "react";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */

const TEAL = "#00d2d3";
const ORANGE = "#FF6D00";
const GREEN = "#00C853";

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

function fmt(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtFull(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function shortNum(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
}

function pct(v: number, min: number, max: number): number {
  return ((v - min) / (max - min)) * 100;
}

/* ═══════════════════════════════════════════════════
   SLIDER CONFIG
   ═══════════════════════════════════════════════════ */

interface SliderDef {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default: number;
  prefix?: string;
  suffix?: string;
}

const SLIDERS: SliderDef[] = [
  {
    key: "reps",
    label: "Number of Sales Reps",
    description: "Active sales reps on the team",
    min: 1,
    max: 20,
    step: 1,
    default: 5,
  },
  {
    key: "price",
    label: "Product Price",
    description: "Price per closed deal",
    min: 499,
    max: 1999,
    step: 100,
    prefix: "$",
    default: 999,
  },
  {
    key: "closesPerDay",
    label: "Closes Per Rep / Day",
    description: "Average deals closed per rep daily",
    min: 0.5,
    max: 5,
    step: 0.5,
    default: 1.5,
  },
  {
    key: "commissionPct",
    label: "Commission %",
    description: "Percentage of revenue paid to reps",
    min: 20,
    max: 60,
    step: 5,
    suffix: "%",
    default: 40,
  },
  {
    key: "leadsPerDay",
    label: "Leads Per Rep / Day",
    description: "Inbound & outbound leads per rep",
    min: 10,
    max: 80,
    step: 5,
    default: 40,
  },
  {
    key: "closeRate",
    label: "Close Rate",
    description: "Percentage of leads that convert",
    min: 5,
    max: 40,
    step: 1,
    suffix: "%",
    default: 20,
  },
  {
    key: "workingDays",
    label: "Working Days / Month",
    description: "Productive selling days per month",
    min: 15,
    max: 25,
    step: 1,
    default: 22,
  },
];

/* ═══════════════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════════════ */

function SliderControl({
  def,
  value,
  onChange,
}: {
  def: SliderDef;
  value: number;
  onChange: (v: number) => void;
}) {
  const fillPct = pct(value, def.min, def.max);
  const displayVal =
    (def.prefix ?? "") +
    (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)) +
    (def.suffix ?? "");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          {def.label}
        </label>
        <span
          className="font-mono text-sm font-semibold"
          style={{ color: TEAL }}
        >
          {displayVal}
        </span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-input w-full"
        style={
          {
            "--fill-pct": `${fillPct}%`,
          } as React.CSSProperties
        }
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-600 font-mono">
          {def.prefix ?? ""}
          {def.min}
          {def.suffix ?? ""}
        </span>
        <span className="text-[10px] text-slate-500 leading-tight">
          {def.description}
        </span>
        <span className="text-[10px] text-slate-600 font-mono">
          {def.prefix ?? ""}
          {def.max.toLocaleString()}
          {def.suffix ?? ""}
        </span>
      </div>
    </div>
  );
}

function HeroCard({
  label,
  value,
  fullValue,
  color,
}: {
  label: string;
  value: string;
  fullValue: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-slate-900/60 p-5 sm:p-6 flex-1 min-w-0"
      style={{ borderColor: `${color}30` }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </p>
      <p className="text-2xl sm:text-3xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-slate-500 font-mono mt-1">{fullValue}</p>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 text-center">
      <p
        className="text-lg sm:text-xl font-bold font-mono"
        style={{ color: color ?? TEAL }}
      >
        {value}
      </p>
      <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function FunnelBar({
  label,
  value,
  widthPct,
  color,
}: {
  label: string;
  value: string;
  widthPct: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div
        className="rounded-lg px-4 py-3 flex items-center justify-between transition-all duration-300"
        style={{
          width: `${widthPct}%`,
          backgroundColor: `${color}18`,
          borderLeft: `3px solid ${color}`,
        }}
      >
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="font-mono text-sm font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export default function RevenueSimulatorPage() {
  const defaults: Record<string, number> = {};
  for (const s of SLIDERS) defaults[s.key] = s.default;

  const [values, setValues] = useState<Record<string, number>>(defaults);

  const set = (key: string, v: number) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  /* ── Calculations ── */
  const calc = useMemo(() => {
    const reps = values.reps;
    const price = values.price;
    const closesPerDay = values.closesPerDay;
    const commPct = values.commissionPct / 100;
    const leadsPerDay = values.leadsPerDay;
    const closeRate = values.closeRate / 100;
    const workDays = values.workingDays;

    // Daily
    const dailySales = closesPerDay * reps;
    const dailyGross = dailySales * price;
    const dailyComm = dailyGross * commPct;
    const dailyNet = dailyGross - dailyComm;

    // Monthly
    const monthlyGross = dailyGross * workDays;
    const monthlyComm = dailyComm * workDays;
    const monthlyNet = dailyNet * workDays;

    // Annual
    const annualGross = monthlyGross * 12;
    const annualNet = monthlyNet * 12;

    // Per rep
    const commPerSale = price * commPct;
    const repDaily = closesPerDay * price * commPct;
    const repWeekly = repDaily * 5;
    const repMonthly = repDaily * workDays;

    // Lead flow
    const leadsPerDayAll = leadsPerDay * reps;
    const leadsPerMonth = leadsPerDayAll * workDays;
    const salesPerMonth = dailySales * workDays;
    const leadsPerSale = closeRate > 0 ? 1 / closeRate : 0;

    // Funnel (monthly)
    const funnelLeads = leadsPerMonth;
    const funnelConversations = Math.round(funnelLeads * 0.4);
    const funnelInterested = Math.round(funnelLeads * 0.18);
    const funnelClosed = Math.round(funnelLeads * closeRate);

    // 12-month projection
    const months = Array.from({ length: 12 }, (_, i) => {
      let ramp = 1;
      if (i === 0) ramp = 0.5;
      else if (i === 1) ramp = 0.75;
      const gross = monthlyGross * ramp;
      const net = monthlyNet * ramp;
      return { month: i + 1, gross, net };
    });

    return {
      dailySales,
      dailyGross,
      dailyComm,
      dailyNet,
      monthlyGross,
      monthlyComm,
      monthlyNet,
      annualGross,
      annualNet,
      commPerSale,
      repDaily,
      repWeekly,
      repMonthly,
      leadsPerDayAll,
      leadsPerMonth,
      salesPerMonth,
      leadsPerSale,
      funnelLeads,
      funnelConversations,
      funnelInterested,
      funnelClosed,
      months,
    };
  }, [values]);

  const maxBarVal = Math.max(...calc.months.map((m) => m.gross));

  const MONTH_LABELS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <div
      className={`min-h-screen bg-slate-950 ${ibmPlexMono.variable}`}
      style={{ "--font-mono": "var(--font-ibm-plex-mono)" } as React.CSSProperties}
    >
      {/* ── Header ── */}
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: `${TEAL}20`, color: TEAL }}
            >
              IC
            </div>
            <div>
              <p className="text-sm font-semibold text-white tracking-tight">
                Integrity Cap{" "}
                <span className="text-slate-600 font-normal">×</span>{" "}
                Business Eligibility
              </p>
              <p className="text-[10px] uppercase tracking-widest text-slate-600">
                Internal Sales Tool
              </p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{
              borderColor: `${TEAL}30`,
              backgroundColor: `${TEAL}10`,
              color: TEAL,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: TEAL }}
            />
            Revenue Simulator
          </span>
        </div>
      </header>

      {/* ── Title ── */}
      <div className="mx-auto max-w-7xl px-6 pt-8 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Sales Team Revenue Simulator
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Model rep performance, commission structures, and revenue projections
          in real time.
        </p>
      </div>

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-7xl px-6 pb-16 flex flex-col lg:flex-row gap-8">
        {/* ═══ LEFT SIDEBAR ═══ */}
        <aside className="w-full lg:w-[340px] lg:shrink-0">
          <div className="lg:sticky lg:top-6 space-y-1">
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-5 w-1 rounded-full"
                  style={{ backgroundColor: TEAL }}
                />
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Controls
                </h2>
              </div>
              {SLIDERS.map((s) => (
                <SliderControl
                  key={s.key}
                  def={s}
                  value={values[s.key]}
                  onChange={(v) => set(s.key, v)}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* ═══ RIGHT RESULTS ═══ */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ── Hero stat cards ── */}
          <div className="flex flex-col sm:flex-row gap-4">
            <HeroCard
              label="Monthly Revenue"
              value={shortNum(calc.monthlyGross)}
              fullValue={fmtFull(calc.monthlyGross)}
              color={TEAL}
            />
            <HeroCard
              label="Total Commission"
              value={shortNum(calc.monthlyComm)}
              fullValue={fmtFull(calc.monthlyComm)}
              color={ORANGE}
            />
            <HeroCard
              label="Net to House"
              value={shortNum(calc.monthlyNet)}
              fullValue={fmtFull(calc.monthlyNet)}
              color={GREEN}
            />
          </div>

          {/* ── Annual summary ── */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Annual Net Profit
              </p>
              <p
                className="text-2xl sm:text-3xl font-bold font-mono"
                style={{ color: GREEN }}
              >
                {shortNum(calc.annualNet)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Annual Gross
              </p>
              <p
                className="text-xl font-bold font-mono"
                style={{ color: TEAL }}
              >
                {shortNum(calc.annualGross)}
              </p>
            </div>
          </div>

          {/* ── 12-Month Bar Chart ── */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">
              12-Month Revenue Projection
            </h3>
            <div className="flex items-end gap-2 h-48">
              {calc.months.map((m, i) => {
                const grossH =
                  maxBarVal > 0 ? (m.gross / maxBarVal) * 100 : 0;
                const netH = maxBarVal > 0 ? (m.net / maxBarVal) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[9px] font-mono text-slate-500">
                      {shortNum(m.gross)}
                    </span>
                    <div className="w-full relative" style={{ height: `${grossH}%` }}>
                      <div
                        className="absolute inset-0 rounded-t-md transition-all duration-300"
                        style={{ backgroundColor: `${TEAL}40` }}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-300"
                        style={{
                          height: `${grossH > 0 ? (netH / grossH) * 100 : 0}%`,
                          backgroundColor: `${GREEN}50`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600">
                      {MONTH_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: `${TEAL}40` }}
                />
                <span className="text-[11px] text-slate-500">
                  Gross Revenue
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: `${GREEN}50` }}
                />
                <span className="text-[11px] text-slate-500">
                  Net to House
                </span>
              </div>
              <span className="text-[10px] text-slate-600 ml-auto">
                Months 1-2 reflect rep ramp-up (50% → 75%)
              </span>
            </div>
          </div>

          {/* ── Daily Breakdown + Per Rep ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Daily Breakdown */}
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Daily Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">
                    Sales (all reps)
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {calc.dailySales.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Daily Gross</span>
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: TEAL }}
                  >
                    {fmt(calc.dailyGross)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">
                    Daily Commission
                  </span>
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: ORANGE }}
                  >
                    {fmt(calc.dailyComm)}
                  </span>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-300">
                    Daily Net
                  </span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: GREEN }}
                  >
                    {fmt(calc.dailyNet)}
                  </span>
                </div>
              </div>
            </div>

            {/* Per Rep Economics */}
            <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Per Rep Economics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">
                    Commission / Sale
                  </span>
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: ORANGE }}
                  >
                    {fmt(calc.commPerSale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Daily Earnings</span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {fmt(calc.repDaily)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">
                    Weekly Earnings
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {fmt(calc.repWeekly)}
                  </span>
                </div>
                <div className="h-px bg-slate-800" />
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-slate-300">
                    Monthly Earnings
                  </span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: ORANGE }}
                  >
                    {fmt(calc.repMonthly)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Lead Flow Analysis ── */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Lead Flow Analysis
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox
                label="Leads / Day (All Reps)"
                value={calc.leadsPerDayAll.toLocaleString()}
              />
              <StatBox
                label="Leads / Month"
                value={calc.leadsPerMonth.toLocaleString()}
              />
              <StatBox
                label="Leads Per Sale"
                value={calc.leadsPerSale.toFixed(1)}
                color={ORANGE}
              />
              <StatBox
                label="Sales / Month"
                value={calc.salesPerMonth.toFixed(0)}
                color={GREEN}
              />
            </div>
          </div>

          {/* ── Sales Funnel ── */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">
              Sales Funnel
            </h3>
            <div className="space-y-3">
              <FunnelBar
                label="Total Leads Contacted"
                value={calc.funnelLeads.toLocaleString()}
                widthPct={100}
                color={TEAL}
              />
              <FunnelBar
                label="Conversations (40%)"
                value={calc.funnelConversations.toLocaleString()}
                widthPct={65}
                color="#38bdf8"
              />
              <FunnelBar
                label="Interested"
                value={calc.funnelInterested.toLocaleString()}
                widthPct={40}
                color={ORANGE}
              />
              <FunnelBar
                label="Closed Sales"
                value={calc.funnelClosed.toLocaleString()}
                widthPct={22}
                color={GREEN}
              />
            </div>
          </div>

          {/* ── Bottom Line Callout ── */}
          <div
            className="rounded-2xl p-[2px]"
            style={{
              background: `linear-gradient(135deg, ${GREEN}60, ${GREEN}20, ${GREEN}60)`,
            }}
          >
            <div className="rounded-2xl bg-slate-950 p-6 sm:p-8">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                The Bottom Line
              </p>
              <p className="text-lg sm:text-xl text-white leading-relaxed">
                With{" "}
                <span className="font-bold" style={{ color: TEAL }}>
                  {values.reps} reps
                </span>{" "}
                closing{" "}
                <span className="font-bold" style={{ color: TEAL }}>
                  {values.closesPerDay} sales/day
                </span>{" "}
                at{" "}
                <span className="font-bold" style={{ color: TEAL }}>
                  ${values.price.toLocaleString()}
                </span>
                , you net{" "}
                <span className="font-bold" style={{ color: GREEN }}>
                  {fmt(calc.monthlyNet)}/month
                </span>{" "}
                after paying{" "}
                <span className="font-bold" style={{ color: ORANGE }}>
                  {values.commissionPct}% commission
                </span>
                .
              </p>
              <p className="text-sm text-slate-400 mt-3">
                Annual net profit:{" "}
                <span
                  className="font-mono font-bold"
                  style={{ color: GREEN }}
                >
                  {fmt(calc.annualNet)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 py-6 text-center">
        <p className="text-xs text-slate-600">
          Powered by{" "}
          <span className="text-slate-400 font-medium">
            Integrity Cap × Business Eligibility
          </span>{" "}
          — Internal Sales Tool
        </p>
      </footer>

      {/* ── Slider Styles ── */}
      <style jsx>{`
        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(
            to right,
            ${TEAL} 0%,
            ${TEAL} var(--fill-pct),
            #1e293b var(--fill-pct),
            #1e293b 100%
          );
          outline: none;
          cursor: pointer;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${TEAL};
          border: 2px solid #0a0f1a;
          box-shadow: 0 0 8px ${TEAL}40;
          cursor: pointer;
          transition: box-shadow 0.15s;
        }
        .slider-input::-webkit-slider-thumb:hover {
          box-shadow: 0 0 14px ${TEAL}70;
        }
        .slider-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${TEAL};
          border: 2px solid #0a0f1a;
          box-shadow: 0 0 8px ${TEAL}40;
          cursor: pointer;
        }
        .slider-input::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: #1e293b;
        }
        .slider-input::-moz-range-progress {
          height: 6px;
          border-radius: 3px;
          background: ${TEAL};
        }
      `}</style>
    </div>
  );
}
