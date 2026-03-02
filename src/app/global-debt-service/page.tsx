"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

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

function parse(raw: string): number {
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

function toCur(raw: string): string {
  const n = parse(raw);
  if (n === 0 && raw === "") return "";
  return n.toLocaleString("en-US");
}

function scoreColor(v: number): string {
  if (v < 1.0) return "#f87171";
  if (v < 1.15) return "#fb923c";
  if (v < 1.25) return "#facc15";
  return "#34d399";
}

function scoreLabel(v: number): string {
  if (v < 1.0) return "Below Break-Even";
  if (v < 1.15) return "Marginal";
  if (v < 1.25) return "Adequate";
  return "Strong";
}

/* ═══════════════════════════════════════════════════
   LENDER DATA
   ═══════════════════════════════════════════════════ */

const LENDERS = [
  { name: "SBA 7(a)", minDscr: 1.15, typical: "1.15x – 1.25x" },
  { name: "Conventional Bank", minDscr: 1.25, typical: "1.25x – 1.5x" },
  { name: "SBA 504", minDscr: 1.2, typical: "1.20x+" },
  { name: "Alternative Lenders", minDscr: 1.0, typical: "1.0x+" },
];

/* ═══════════════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════════════ */

function CurrencyField({
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
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            onChange(toCur(raw));
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2.5 pl-7 pr-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
      </div>
    </div>
  );
}

function AnimatedNum({
  target,
  decimals = 2,
  duration = 1200,
}: {
  target: number;
  decimals?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);
  return <>{display.toFixed(decimals)}x</>;
}

function SectionCard({
  title,
  total,
  borderColor,
  dotColor,
  children,
}: {
  title: string;
  total: number;
  borderColor: string;
  dotColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl bg-slate-900/50 p-5 sm:p-6 space-y-4"
      style={{ border: `1px solid ${borderColor}40` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: dotColor }}
          />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <span className="font-mono text-sm font-semibold" style={{ color: dotColor }}>
          {fmt(total)}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export default function GlobalDebtService() {
  /* ── Income State ── */
  const [businessNOI, setBusinessNOI] = useState("");
  const [personalIncome, setPersonalIncome] = useState("");
  const [otherIncome, setOtherIncome] = useState("");

  /* ── Business Debt State ── */
  const [existingLoans, setExistingLoans] = useState("");
  const [proposedLoan, setProposedLoan] = useState("");
  const [locPayments, setLocPayments] = useState("");

  /* ── Personal Debt State ── */
  const [mortgage, setMortgage] = useState("");
  const [autoLoans, setAutoLoans] = useState("");
  const [studentLoans, setStudentLoans] = useState("");
  const [creditCards, setCreditCards] = useState("");
  const [otherDebt, setOtherDebt] = useState("");

  /* ── Result state ── */
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  /* ── Simulator state ── */
  const [simCCPayoff, setSimCCPayoff] = useState(0);
  const [simMortgageReduce, setSimMortgageReduce] = useState(0);
  const [simRevenueIncrease, setSimRevenueIncrease] = useState(0);
  const [simExtraIncome, setSimExtraIncome] = useState(0);

  /* ── Parsed values ── */
  const inc = useMemo(
    () => ({
      businessNOI: parse(businessNOI),
      personalIncome: parse(personalIncome),
      otherIncome: parse(otherIncome),
    }),
    [businessNOI, personalIncome, otherIncome]
  );

  const bDebt = useMemo(
    () => ({
      existingLoans: parse(existingLoans),
      proposedLoan: parse(proposedLoan),
      locPayments: parse(locPayments),
    }),
    [existingLoans, proposedLoan, locPayments]
  );

  const pDebt = useMemo(
    () => ({
      mortgage: parse(mortgage),
      autoLoans: parse(autoLoans),
      studentLoans: parse(studentLoans),
      creditCards: parse(creditCards),
      otherDebt: parse(otherDebt),
    }),
    [mortgage, autoLoans, studentLoans, creditCards, otherDebt]
  );

  const totalIncome =
    inc.businessNOI + inc.personalIncome + inc.otherIncome;
  const totalBizDebt =
    bDebt.existingLoans + bDebt.proposedLoan + bDebt.locPayments;
  const totalPersonalDebt =
    pDebt.mortgage +
    pDebt.autoLoans +
    pDebt.studentLoans +
    pDebt.creditCards +
    pDebt.otherDebt;
  const totalDebt = totalBizDebt + totalPersonalDebt;

  const dscr = totalBizDebt > 0 ? inc.businessNOI / totalBizDebt : 0;
  const gdsc = totalDebt > 0 ? totalIncome / totalDebt : 0;
  const delta = dscr - gdsc;
  const personalDragsScore = delta > 0.1;

  /* ── Debt items for ranking ── */
  const debtItems = useMemo(() => {
    const items: { name: string; amount: number; type: "business" | "personal" }[] = [];
    if (bDebt.existingLoans > 0)
      items.push({ name: "Existing Loan Payments", amount: bDebt.existingLoans, type: "business" });
    if (bDebt.proposedLoan > 0)
      items.push({ name: "Proposed New Loan", amount: bDebt.proposedLoan, type: "business" });
    if (bDebt.locPayments > 0)
      items.push({ name: "Lines of Credit", amount: bDebt.locPayments, type: "business" });
    if (pDebt.mortgage > 0)
      items.push({ name: "Mortgage/Rent", amount: pDebt.mortgage, type: "personal" });
    if (pDebt.autoLoans > 0)
      items.push({ name: "Auto Loans", amount: pDebt.autoLoans, type: "personal" });
    if (pDebt.studentLoans > 0)
      items.push({ name: "Student Loans", amount: pDebt.studentLoans, type: "personal" });
    if (pDebt.creditCards > 0)
      items.push({ name: "Credit Card Minimums", amount: pDebt.creditCards, type: "personal" });
    if (pDebt.otherDebt > 0)
      items.push({ name: "Other Debt", amount: pDebt.otherDebt, type: "personal" });
    return items.sort((a, b) => b.amount - a.amount);
  }, [bDebt, pDebt]);

  /* ── Income items for visualization ── */
  const incomeItems = useMemo(() => {
    const items: { name: string; amount: number }[] = [];
    if (inc.businessNOI > 0) items.push({ name: "Business NOI", amount: inc.businessNOI });
    if (inc.personalIncome > 0)
      items.push({ name: "Personal Income", amount: inc.personalIncome });
    if (inc.otherIncome > 0) items.push({ name: "Other Income", amount: inc.otherIncome });
    return items;
  }, [inc]);

  /* ── Calculate GDSC if a debt item were removed ── */
  function gdscWithout(amount: number): number {
    const newDebt = totalDebt - amount;
    return newDebt > 0 ? totalIncome / newDebt : 0;
  }

  /* ── Simulator projected GDSC ── */
  const projectedGDSC = useMemo(() => {
    const ccReduction = pDebt.creditCards * (simCCPayoff / 100);
    const mortReduction = pDebt.mortgage * (simMortgageReduce / 100);
    const revBoost = inc.businessNOI * (simRevenueIncrease / 100);
    const newIncome = totalIncome + revBoost + simExtraIncome;
    const newDebt = totalDebt - ccReduction - mortReduction;
    return newDebt > 0 ? newIncome / newDebt : 0;
  }, [
    simCCPayoff,
    simMortgageReduce,
    simRevenueIncrease,
    simExtraIncome,
    totalIncome,
    totalDebt,
    pDebt.creditCards,
    pDebt.mortgage,
    inc.businessNOI,
  ]);

  /* ── Action items ── */
  function getActionItems(): string[] {
    const items: string[] = [];

    if (pDebt.creditCards > 0) {
      const withoutCC = gdscWithout(pDebt.creditCards);
      items.push(
        `Pay off ${fmt(pDebt.creditCards)} in credit card minimums to boost your Global DSC from ${gdsc.toFixed(2)}x to ${withoutCC.toFixed(2)}x`
      );
    }

    if (inc.personalIncome === 0) {
      items.push(
        "Add personal income sources (spouse income, rental income) to strengthen your global ratio — lenders count all household income"
      );
    }

    if (dscr >= 1.25 && gdsc < 1.25) {
      items.push(
        "Your business DSCR is strong, but personal debt is weakening your global ratio — focus on reducing personal obligations first"
      );
    }

    if (gdsc < 1.0) {
      items.push(
        "Your total obligations exceed your combined income — prioritize eliminating your largest personal debt before applying for financing"
      );
      items.push(
        "Consider consolidating high-interest personal debts to lower monthly minimums"
      );
    } else if (gdsc < 1.15) {
      items.push(
        "You're just above break-even — even a small reduction in personal debt or increase in income could move you into the qualifying range"
      );
    } else if (gdsc < 1.25) {
      items.push(
        "You qualify for some programs but a modest improvement could unlock better rates — target eliminating one personal debt item"
      );
    } else {
      items.push(
        "Your Global DSC is strong — shop multiple lenders for the best terms and rates"
      );
      items.push(
        "Lock in long-term fixed rates while your combined debt service capacity is healthy"
      );
    }

    if (totalPersonalDebt > totalBizDebt && gdsc < 1.25) {
      items.push(
        `Personal debt (${fmt(totalPersonalDebt)}) exceeds business debt (${fmt(totalBizDebt)}) — reducing personal obligations will have the biggest impact on your ratio`
      );
    }

    return items;
  }

  /* ── Can calculate ── */
  const canCalc = totalIncome > 0 && totalDebt > 0;

  const calculate = useCallback(() => {
    if (!canCalc) return;
    setShowResult(false);
    setSimCCPayoff(0);
    setSimMortgageReduce(0);
    setSimRevenueIncrease(0);
    setSimExtraIncome(0);
    requestAnimationFrame(() => {
      setShowResult(true);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    });
  }, [canCalc]);

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Badge */}
      <div className="flex justify-center pt-6 pb-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Business Eligibility
        </span>
      </div>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-4">
        {/* Title */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Global Debt Service Calculator
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            See the full picture lenders evaluate — your business and personal
            debt obligations combined.
          </p>
        </div>

        {/* ── Formula bar ── */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 mb-6 text-center font-mono text-xs sm:text-sm text-slate-400 overflow-x-auto">
          <span className="whitespace-nowrap">
            (<span className="text-emerald-400">Business NOI</span> +{" "}
            <span className="text-emerald-400">Personal Income</span> +{" "}
            <span className="text-emerald-400">Other Income</span>) ÷ (
            <span className="text-purple-400">All Business Debt</span> +{" "}
            <span className="text-red-400">All Personal Debt</span>) ={" "}
            <span className="text-cyan-400 font-semibold">Global DSC</span>
          </span>
        </div>

        {/* ── Explainer cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-2">
            <h3 className="text-sm font-semibold text-cyan-400">
              DSCR — Business Only
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Traditional DSCR only looks at your business income vs. business
              debt. It answers: can the business alone cover its obligations?
            </p>
          </div>
          <div className="rounded-2xl border border-orange-400/30 bg-orange-400/5 p-5 space-y-2">
            <h3 className="text-sm font-semibold text-orange-400">
              Global DSC — Full Picture
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global DSC includes personal income and personal debts. Most SBA
              and bank lenders require this to evaluate the full guarantor
              picture.
            </p>
          </div>
        </div>

        {/* ── INPUT SECTIONS ── */}
        <div className="space-y-5 mb-8">
          {/* Income */}
          <SectionCard
            title="Income"
            total={totalIncome}
            borderColor="#34d399"
            dotColor="#34d399"
          >
            <CurrencyField
              label="Business Net Operating Income"
              value={businessNOI}
              onChange={setBusinessNOI}
              placeholder="150,000"
            />
            <CurrencyField
              label="Personal Income (W-2 / Salary / Spouse / Rental)"
              value={personalIncome}
              onChange={setPersonalIncome}
              placeholder="85,000"
            />
            <CurrencyField
              label="Other Income (Dividends / Investments)"
              value={otherIncome}
              onChange={setOtherIncome}
              placeholder="12,000"
            />
          </SectionCard>

          {/* Business Debt */}
          <SectionCard
            title="Business Debt"
            total={totalBizDebt}
            borderColor="#a78bfa"
            dotColor="#a78bfa"
          >
            <CurrencyField
              label="Existing Loan Payments"
              value={existingLoans}
              onChange={setExistingLoans}
              placeholder="40,000"
            />
            <CurrencyField
              label="Proposed New Loan Payment"
              value={proposedLoan}
              onChange={setProposedLoan}
              placeholder="24,000"
            />
            <CurrencyField
              label="Lines of Credit Payments"
              value={locPayments}
              onChange={setLocPayments}
              placeholder="6,000"
            />
          </SectionCard>

          {/* Personal Debt */}
          <SectionCard
            title="Personal Debt"
            total={totalPersonalDebt}
            borderColor="#f87171"
            dotColor="#f87171"
          >
            <CurrencyField
              label="Mortgage / Rent"
              value={mortgage}
              onChange={setMortgage}
              placeholder="24,000"
            />
            <CurrencyField
              label="Auto Loans"
              value={autoLoans}
              onChange={setAutoLoans}
              placeholder="7,200"
            />
            <CurrencyField
              label="Student Loans"
              value={studentLoans}
              onChange={setStudentLoans}
              placeholder="4,800"
            />
            <CurrencyField
              label="Credit Card Minimums"
              value={creditCards}
              onChange={setCreditCards}
              placeholder="3,600"
            />
            <CurrencyField
              label="Other Debt (Child Support / Personal Loans)"
              value={otherDebt}
              onChange={setOtherDebt}
              placeholder="0"
            />
          </SectionCard>
        </div>

        {/* Calculate button */}
        <button
          onClick={calculate}
          disabled={!canCalc}
          className="w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cyan-500 mb-8"
        >
          Calculate Global DSC
        </button>

        {/* ═══ RESULTS ═══ */}
        {showResult && totalDebt > 0 && (
          <div
            ref={resultRef}
            className="space-y-8 animate-[fadeIn_0.5s_ease-out]"
          >
            {/* ── Hero: DSCR vs GDSC ── */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Business DSCR */}
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-center space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Business-Only DSCR
                </p>
                <p
                  className="font-mono text-4xl sm:text-5xl font-bold tabular-nums"
                  style={{ color: scoreColor(dscr) }}
                >
                  <AnimatedNum target={dscr} />
                </p>
                <span
                  className="inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    color: scoreColor(dscr),
                    background: `${scoreColor(dscr)}20`,
                  }}
                >
                  {totalBizDebt > 0 ? scoreLabel(dscr) : "N/A"}
                </span>
              </div>

              {/* VS */}
              <div className="hidden sm:flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-600">vs</span>
                {delta > 0.01 && (
                  <span className="text-[10px] font-mono text-red-400">
                    -{delta.toFixed(2)}x
                  </span>
                )}
              </div>

              {/* Global DSC */}
              <div
                className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5 text-center space-y-2"
                style={{
                  boxShadow:
                    gdsc >= 1.25
                      ? "0 0 30px rgba(52,211,153,0.1)"
                      : gdsc < 1.0
                      ? "0 0 30px rgba(248,113,113,0.1)"
                      : "none",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Global DSC
                </p>
                <p
                  className="font-mono text-4xl sm:text-5xl font-bold tabular-nums"
                  style={{ color: scoreColor(gdsc) }}
                >
                  <AnimatedNum target={gdsc} />
                </p>
                <span
                  className="inline-block rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    color: scoreColor(gdsc),
                    background: `${scoreColor(gdsc)}20`,
                  }}
                >
                  {scoreLabel(gdsc)}
                </span>
              </div>
            </div>

            {/* Personal debt warning */}
            {personalDragsScore && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
                <span className="text-red-400 text-lg shrink-0">⚠️</span>
                <p className="text-sm text-red-300">
                  <span className="font-semibold">Personal debt is significantly impacting your score.</span>{" "}
                  <span className="text-red-400/80">
                    Your business DSCR is {dscr.toFixed(2)}x, but personal
                    obligations drop your Global DSC to {gdsc.toFixed(2)}x — a
                    decrease of {delta.toFixed(2)}x. Most lenders evaluate the
                    global number.
                  </span>
                </p>
              </div>
            )}

            {/* ── Income vs Debt Visualization ── */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white">
                Income vs. Debt Breakdown
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Income bars */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Income Sources
                  </p>
                  {incomeItems.map((item) => {
                    const pct =
                      totalIncome > 0
                        ? (item.amount / totalIncome) * 100
                        : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{item.name}</span>
                          <span className="font-mono text-slate-300">
                            {fmt(item.amount)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Debt bars */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                    Debt Obligations
                  </p>
                  {debtItems.map((item) => {
                    const pct =
                      totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
                    const color =
                      item.type === "personal" ? "#f87171" : "#a78bfa";
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">{item.name}</span>
                          <span className="font-mono text-slate-300">
                            {fmt(item.amount)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Split bar */}
              {totalDebt > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 text-center">
                    Debt Composition
                  </p>
                  <div className="h-3 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-purple-400 transition-all duration-700"
                      style={{
                        width: `${(totalBizDebt / totalDebt) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-red-400 transition-all duration-700"
                      style={{
                        width: `${(totalPersonalDebt / totalDebt) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-purple-400">
                      Business {((totalBizDebt / totalDebt) * 100).toFixed(0)}%
                    </span>
                    <span className="text-red-400">
                      Personal{" "}
                      {((totalPersonalDebt / totalDebt) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── What's Dragging Down Your Ratio ── */}
            {debtItems.length > 0 && (
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  What&apos;s Dragging Down Your Ratio
                </h2>
                <div className="space-y-3">
                  {debtItems.map((item, i) => {
                    const pct =
                      totalDebt > 0
                        ? ((item.amount / totalDebt) * 100).toFixed(1)
                        : "0";
                    const improved = gdscWithout(item.amount);
                    const improveDelta = improved - gdsc;
                    const color =
                      item.type === "personal" ? "#f87171" : "#a78bfa";
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span
                          className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold font-mono"
                          style={{
                            color,
                            background: `${color}20`,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-300 truncate">
                              {item.name}
                            </span>
                            <span className="font-mono text-slate-400 shrink-0">
                              {fmt(item.amount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] mt-0.5">
                            <span className="text-slate-500">
                              {pct}% of total debt
                            </span>
                            <span className="text-emerald-400 font-mono">
                              +{improveDelta.toFixed(2)}x if eliminated
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Action Items ── */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Recommended Actions
              </h2>
              <ol className="space-y-3">
                {getActionItems().map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span
                      className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold font-mono"
                      style={{
                        color: scoreColor(gdsc),
                        background: `${scoreColor(gdsc)}20`,
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

            {/* ── Improvement Simulator ── */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 sm:p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white">
                Improvement Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Adjust the sliders to see how changes impact your Global DSC in
                real time.
              </p>

              <div className="space-y-4">
                {pDebt.creditCards > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        Pay off credit cards
                      </span>
                      <span className="font-mono text-slate-300">
                        {simCCPayoff}%
                        {simCCPayoff > 0 &&
                          ` (−${fmt(pDebt.creditCards * (simCCPayoff / 100))})`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={simCCPayoff}
                      onChange={(e) => setSimCCPayoff(Number(e.target.value))}
                      className="w-full h-1.5 accent-cyan-500 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
                    />
                  </div>
                )}

                {pDebt.mortgage > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        Reduce mortgage payment
                      </span>
                      <span className="font-mono text-slate-300">
                        {simMortgageReduce}%
                        {simMortgageReduce > 0 &&
                          ` (−${fmt(pDebt.mortgage * (simMortgageReduce / 100))})`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={simMortgageReduce}
                      onChange={(e) =>
                        setSimMortgageReduce(Number(e.target.value))
                      }
                      className="w-full h-1.5 accent-cyan-500 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      Increase business revenue
                    </span>
                    <span className="font-mono text-slate-300">
                      {simRevenueIncrease}%
                      {simRevenueIncrease > 0 &&
                        ` (+${fmt(inc.businessNOI * (simRevenueIncrease / 100))})`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={simRevenueIncrease}
                    onChange={(e) =>
                      setSimRevenueIncrease(Number(e.target.value))
                    }
                    className="w-full h-1.5 accent-cyan-500 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">
                      Add household income
                    </span>
                    <span className="font-mono text-slate-300">
                      {fmt(simExtraIncome)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100000}
                    step={5000}
                    value={simExtraIncome}
                    onChange={(e) =>
                      setSimExtraIncome(Number(e.target.value))
                    }
                    className="w-full h-1.5 accent-cyan-500 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
                  />
                </div>
              </div>

              {/* Current → Projected */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Current
                  </p>
                  <p
                    className="font-mono text-2xl font-bold"
                    style={{ color: scoreColor(gdsc) }}
                  >
                    {gdsc.toFixed(2)}x
                  </p>
                </div>
                <span className="text-slate-600 text-lg">→</span>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Projected
                  </p>
                  <p
                    className="font-mono text-2xl font-bold"
                    style={{ color: scoreColor(projectedGDSC) }}
                  >
                    {projectedGDSC.toFixed(2)}x
                  </p>
                </div>
                {projectedGDSC > gdsc && (
                  <span className="text-emerald-400 font-mono text-sm font-semibold">
                    +{(projectedGDSC - gdsc).toFixed(2)}x
                  </span>
                )}
              </div>
            </div>

            {/* ── Lender Thresholds ── */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Lender Threshold Comparison
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-800/50">
                      <th className="px-4 py-3 font-semibold text-slate-300">
                        Lender Type
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-300 text-center">
                        Min GDSC
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
                      const q = gdsc >= l.minDscr;
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
                            {q ? (
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
