"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseCurrency(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, "")) || 0;
}

function toCurrencyInput(raw: string, allowNeg = false): string {
  const cleaned = allowNeg
    ? raw.replace(/[^0-9.-]/g, "")
    : raw.replace(/[^0-9.]/g, "");
  const num = Number(cleaned) || 0;
  if (num === 0 && raw === "") return "";
  if (num < 0 && allowNeg) {
    return "-" + Math.abs(num).toLocaleString("en-US");
  }
  return Math.abs(num).toLocaleString("en-US");
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const str = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return n < 0 ? "-" + str : str;
}

function dscrColor(dscr: number): string {
  if (dscr >= 1.25) return "text-emerald-400";
  if (dscr >= 1.15) return "text-yellow-400";
  if (dscr >= 1.0) return "text-orange-400";
  return "text-red-400";
}

function dscrBarGradient(dscr: number): string {
  if (dscr >= 1.25) return "from-emerald-500 to-emerald-400";
  if (dscr >= 1.15) return "from-yellow-500 to-yellow-400";
  if (dscr >= 1.0) return "from-orange-500 to-orange-400";
  return "from-red-500 to-red-400";
}

function dscrLabel(dscr: number): string {
  if (dscr >= 1.5) return "Strong";
  if (dscr >= 1.25) return "Bank Standard";
  if (dscr >= 1.15) return "SBA Minimum";
  if (dscr >= 1.0) return "Break-Even";
  return "Below Break-Even";
}

/* ------------------------------------------------------------------ */
/*  CurrencyInput                                                      */
/* ------------------------------------------------------------------ */

function CurrencyInput({
  label,
  value,
  onChange,
  allowNegative,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowNegative?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[14px] font-medium text-slate-400">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (allowNegative && (raw === "-" || raw === "-$")) {
              onChange("-");
              return;
            }
            onChange(toCurrencyInput(raw, allowNegative));
          }}
          placeholder="0"
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-8 pr-4 text-white font-mono text-[15px] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

type CompPlacement = "own-line" | "mixed" | "not-listed";

export default function TaxImpact() {
  const [grossRevenue, setGrossRevenue] = useState("");
  const [netIncome, setNetIncome] = useState("");
  const [officerComp, setOfficerComp] = useState("");
  const [compPlacement, setCompPlacement] = useState<CompPlacement>("own-line");
  const [depreciation, setDepreciation] = useState("");
  const [interestExpense, setInterestExpense] = useState("");
  const [amortization, setAmortization] = useState("");
  const [otherAddbacks, setOtherAddbacks] = useState("");
  const [existingDebt, setExistingDebt] = useState("");
  const [proposedDebt, setProposedDebt] = useState("");
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const ni = parseCurrency(netIncome);
  const oc = parseCurrency(officerComp);
  const dep = parseCurrency(depreciation);
  const intExp = parseCurrency(interestExpense);
  const amort = parseCurrency(amortization);
  const other = parseCurrency(otherAddbacks);
  const exDebt = parseCurrency(existingDebt);
  const newDebt = parseCurrency(proposedDebt);
  const totalDebt = exDebt + newDebt;

  // Addback logic
  const compAccepted = compPlacement === "own-line";
  const acceptedAddbacks =
    (compAccepted ? oc : 0) + dep + intExp + amort;
  const rejectedAddbacks = (!compAccepted ? oc : 0) + other;
  const totalAddbacks = oc + dep + intExp + amort + other;

  // Income calculations
  const bankableIncome = ni + acceptedAddbacks;
  const maxPossibleIncome = ni + oc + dep + intExp + amort; // if comp were fixed

  // DSCR calculations
  const taxDscr = totalDebt > 0 ? ni / totalDebt : 0;
  const adjDscr = totalDebt > 0 ? bankableIncome / totalDebt : 0;
  const maxDscr = totalDebt > 0 ? maxPossibleIncome / totalDebt : 0;

  // Income left on table from misclassified comp
  const incomeOnTable = !compAccepted ? oc : 0;

  // Addback items for breakdown
  const addbackItems = [
    {
      name: "Officer/Owner Compensation",
      amount: oc,
      accepted: compAccepted,
      status: compAccepted
        ? "Accepted — listed on its own line"
        : compPlacement === "mixed"
        ? "Rejected — buried in Salaries & Wages"
        : "Rejected — not listed on return",
      statusColor: compAccepted ? "text-emerald-400" : "text-red-400",
      dotColor: compAccepted ? "bg-emerald-400" : "bg-red-400",
      fix: !compAccepted
        ? "Reclassify to a dedicated Officer Compensation line on your next return."
        : null,
    },
    {
      name: "Depreciation",
      amount: dep,
      accepted: true,
      status: "Accepted — standard non-cash addback",
      statusColor: "text-emerald-400",
      dotColor: "bg-emerald-400",
      fix: null,
    },
    {
      name: "Interest Expense",
      amount: intExp,
      accepted: true,
      status: "Accepted — added back for DSCR calculation",
      statusColor: "text-emerald-400",
      dotColor: "bg-emerald-400",
      fix: null,
    },
    {
      name: "Amortization",
      amount: amort,
      accepted: true,
      status: "Accepted — standard non-cash addback",
      statusColor: "text-emerald-400",
      dotColor: "bg-emerald-400",
      fix: null,
    },
    {
      name: "Other Potential Addbacks",
      amount: other,
      accepted: false,
      status: "Not accepted — requires specific documentation",
      statusColor: "text-orange-400",
      dotColor: "bg-orange-400",
      fix: null,
    },
  ].filter((a) => a.amount > 0);

  // Recommendations
  const recommendations: { level: string; color: string; bg: string; text: string }[] = [];

  if (!compAccepted && oc > 0) {
    recommendations.push({
      level: "CRITICAL",
      color: "text-red-400",
      bg: "bg-red-500/15 border-red-500/30",
      text: `Your officer compensation of ${fmt(oc)} is ${compPlacement === "mixed" ? "buried in Salaries & Wages" : "not listed"} on your tax return. Banks cannot add back what they can't verify. Have your CPA reclassify this to a dedicated Officer Compensation line on your next return. This alone could increase your bankable income by ${fmt(oc)} and raise your DSCR from ${adjDscr.toFixed(2)}x to ${maxDscr.toFixed(2)}x.`,
    });
  }

  if (ni < 0 && bankableIncome > 0) {
    recommendations.push({
      level: "HIGH",
      color: "text-yellow-400",
      bg: "bg-yellow-500/15 border-yellow-500/30",
      text: `Your tax return shows a net loss of ${fmt(ni)}, but with accepted addbacks your bankable income is actually ${fmt(bankableIncome)}. Make sure your loan officer understands the addback methodology — many borrowers get declined because the lender only looks at the bottom line.`,
    });
  }

  if (adjDscr >= 1.0 && adjDscr < 1.25 && totalDebt > 0) {
    const needed = totalDebt * 1.25 - bankableIncome;
    recommendations.push({
      level: "MEDIUM",
      color: "text-cyan-400",
      bg: "bg-cyan-500/15 border-cyan-500/30",
      text: `Your adjusted DSCR of ${adjDscr.toFixed(2)}x is close to the 1.25x bank standard. You need ${fmt(Math.max(needed, 0))} more in bankable income to reach this threshold. Consider reducing expenses, documenting additional addbacks, or paying down existing debt.`,
    });
  }

  if (adjDscr < 1.0 && totalDebt > 0) {
    recommendations.push({
      level: "HIGH",
      color: "text-yellow-400",
      bg: "bg-yellow-500/15 border-yellow-500/30",
      text: `Even with accepted addbacks, your DSCR is below 1.0x — meaning your business income doesn't cover debt obligations. Focus on increasing revenue, reducing expenses, or reducing your debt load before applying for new financing.`,
    });
  }

  if (other > 0) {
    recommendations.push({
      level: "LOW",
      color: "text-slate-400",
      bg: "bg-slate-700/30 border-slate-600/30",
      text: `You listed ${fmt(other)} in other potential addbacks. Most banks will not accept these without specific documentation. Work with your CPA to determine if any qualify as one-time, non-recurring, or discretionary expenses that can be properly documented.`,
    });
  }

  if (dep > 0 && dep > ni * 0.5 && ni > 0) {
    recommendations.push({
      level: "MEDIUM",
      color: "text-cyan-400",
      bg: "bg-cyan-500/15 border-cyan-500/30",
      text: `Depreciation of ${fmt(dep)} represents a significant portion of your income. While banks accept this addback, aggressive depreciation schedules can raise questions. Ensure your depreciation schedule is well-documented and defensible.`,
    });
  }

  // Bottom line narrative
  let bottomLine = "";
  if (totalDebt === 0) {
    bottomLine = `Without debt obligations entered, we can't calculate a DSCR. Your bankable income with accepted addbacks is ${fmt(bankableIncome)}. Enter your existing and proposed debt to see how your tax return impacts loan qualification.`;
  } else if (adjDscr >= 1.25) {
    bottomLine = `Your tax return supports borrowing. With accepted addbacks, your bankable income of ${fmt(bankableIncome)} produces a ${adjDscr.toFixed(2)}x DSCR — above the 1.25x bank standard. ${!compAccepted && oc > 0 ? `However, fixing your officer comp classification could push this even higher to ${maxDscr.toFixed(2)}x, giving you room for better terms or larger loans.` : "You're well-positioned for conventional bank financing."}`;
  } else if (adjDscr >= 1.15) {
    bottomLine = `You qualify for SBA lending at ${adjDscr.toFixed(2)}x DSCR, but fall short of the 1.25x conventional bank standard. ${!compAccepted && oc > 0 ? `Reclassifying your officer comp would push your DSCR to ${maxDscr.toFixed(2)}x — potentially qualifying you for bank financing with better rates.` : "Focus on increasing bankable income or reducing debt to reach 1.25x for conventional options."}`;
  } else if (adjDscr >= 1.0) {
    bottomLine = `At ${adjDscr.toFixed(2)}x DSCR, your business barely covers its debt obligations. ${ni < 0 ? "While your tax return shows a loss, addbacks bring you above break-even — make sure your lender understands this." : ""} ${!compAccepted && oc > 0 ? `Fixing officer comp classification could improve your DSCR to ${maxDscr.toFixed(2)}x.` : "You'll need to strengthen your position before applying for new debt."}`;
  } else {
    bottomLine = `Your current adjusted DSCR of ${adjDscr.toFixed(2)}x is below break-even. ${ni < 0 && bankableIncome > 0 ? "Your tax return shows a loss, but addbacks bring income positive — your return is working against you more than your actual business performance." : "You'll need to significantly increase income or reduce debt before qualifying for new financing."} ${!compAccepted && oc > 0 ? `Reclassifying officer comp is a critical first step that would add ${fmt(oc)} to your bankable income.` : ""}`;
  }

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
            Tax Impact Simulator
          </h1>
          <p className="text-slate-400 text-[15px] sm:text-base max-w-xl mx-auto">
            See how your tax strategy is helping or hurting your loan
            eligibility — and exactly what to reclassify to maximize your
            bankable income.
          </p>
        </div>

        {/* Core Conflict Banner */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-5 mb-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                Your CPA&rsquo;s Goal
              </p>
              <p className="text-[15px] text-slate-300 font-medium">
                Minimize taxable income
              </p>
            </div>
            <span className="text-red-400 font-bold text-xl">vs</span>
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                The Bank&rsquo;s Requirement
              </p>
              <p className="text-[15px] text-slate-300 font-medium">
                Evaluate ability to repay
              </p>
            </div>
          </div>
          <p className="text-center text-yellow-400 text-[14px] font-semibold mt-3">
            These two goals are in direct conflict.
          </p>
        </div>

        {/* ---- INPUTS ---- */}
        <div className="space-y-5 mb-6">
          {/* Tax Return Numbers */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full">
              Tax Return Numbers
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Annual Gross Revenue"
                value={grossRevenue}
                onChange={setGrossRevenue}
              />
              <CurrencyInput
                label="Net Income (bottom line)"
                value={netIncome}
                onChange={setNetIncome}
                allowNegative
              />
            </div>
          </div>

          {/* Addback Line Items */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-5">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">
              Addback Line Items
            </span>

            <CurrencyInput
              label="Officer/Owner Compensation"
              value={officerComp}
              onChange={setOfficerComp}
            />

            <div className="space-y-2">
              <label className="text-[14px] font-medium text-slate-400">
                Where is officer comp listed on your return?
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      value: "own-line" as CompPlacement,
                      label: "Own Dedicated Line",
                      active: "bg-emerald-500/15 border-emerald-500/50 text-emerald-400",
                    },
                    {
                      value: "mixed" as CompPlacement,
                      label: "Mixed in Salaries & Wages",
                      active: "bg-red-500/15 border-red-500/50 text-red-400",
                    },
                    {
                      value: "not-listed" as CompPlacement,
                      label: "Not Listed",
                      active: "bg-red-500/15 border-red-500/50 text-red-400",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCompPlacement(opt.value)}
                    className={`rounded-full px-4 py-2.5 text-[14px] font-medium transition-all ${
                      compPlacement === opt.value
                        ? opt.active
                        : "bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600"
                    } border`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Depreciation"
                value={depreciation}
                onChange={setDepreciation}
              />
              <CurrencyInput
                label="Interest Expense"
                value={interestExpense}
                onChange={setInterestExpense}
              />
              <CurrencyInput
                label="Amortization"
                value={amortization}
                onChange={setAmortization}
              />
              <CurrencyInput
                label="Other Potential Addbacks"
                value={otherAddbacks}
                onChange={setOtherAddbacks}
              />
            </div>
          </div>

          {/* Debt Obligations */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full">
              Debt Obligations
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              <CurrencyInput
                label="Existing Annual Debt"
                value={existingDebt}
                onChange={setExistingDebt}
              />
              <CurrencyInput
                label="Proposed New Annual Debt"
                value={proposedDebt}
                onChange={setProposedDebt}
              />
            </div>
          </div>
        </div>

        {/* Calculate */}
        <button
          onClick={handleCalculate}
          className="w-full rounded-xl bg-cyan-500 py-3.5 text-base font-semibold text-slate-950 hover:bg-cyan-400 active:scale-[0.98] transition-all mb-8"
        >
          Simulate Tax Impact
        </button>

        {/* ==================== RESULTS ==================== */}
        {showResults && (
          <div
            ref={resultsRef}
            className="animate-[fadeUp_0.5s_ease-out] space-y-8"
          >
            {/* Hero comparison */}
            <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Tax Return */}
              <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  What Your Tax Return Shows
                </p>
                <div className="space-y-1">
                  <p className="text-[13px] text-slate-400">Net Income</p>
                  <p className={`text-2xl font-bold font-mono ${ni >= 0 ? "text-white" : "text-red-400"}`}>
                    {fmt(ni)}
                  </p>
                </div>
                {totalDebt > 0 && (
                  <div className="space-y-1">
                    <p className="text-[13px] text-slate-400">Tax Return DSCR</p>
                    <p className={`text-2xl font-bold font-mono ${dscrColor(taxDscr)}`}>
                      {taxDscr.toFixed(2)}x
                    </p>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1">
                <svg className="w-8 h-8 text-emerald-400 rotate-90 sm:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-emerald-400 font-bold font-mono text-[13px]">
                  +{fmt(acceptedAddbacks)}
                </span>
                <span className="text-[11px] text-slate-500">addbacks</span>
              </div>

              {/* Bank View */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3 shadow-[0_0_30px_-5px] shadow-emerald-500/15">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  What Banks Actually See
                </p>
                <div className="space-y-1">
                  <p className="text-[13px] text-slate-400">Bankable Income</p>
                  <p className={`text-2xl font-bold font-mono ${bankableIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmt(bankableIncome)}
                  </p>
                </div>
                {totalDebt > 0 && (
                  <div className="space-y-1">
                    <p className="text-[13px] text-slate-400">Adjusted DSCR</p>
                    <p className={`text-2xl font-bold font-mono ${dscrColor(adjDscr)}`}>
                      {adjDscr.toFixed(2)}x
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* DSCR improvement banner */}
            {totalDebt > 0 && acceptedAddbacks > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <p className="text-emerald-400 font-semibold text-[15px]">
                  Addbacks improve your DSCR from{" "}
                  <span className="font-mono">{taxDscr.toFixed(2)}x</span> to{" "}
                  <span className="font-mono">{adjDscr.toFixed(2)}x</span>
                  {adjDscr >= 1.25 && taxDscr < 1.25
                    ? " — crossing the 1.25x bank standard"
                    : adjDscr >= 1.15 && taxDscr < 1.15
                    ? " — crossing the 1.15x SBA minimum"
                    : ""}
                </p>
              </div>
            )}

            {/* Income on table warning */}
            {incomeOnTable > 0 && totalDebt > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center space-y-1">
                <p className="text-red-400 font-semibold text-[15px]">
                  {fmt(incomeOnTable)} in income is being left on the table
                </p>
                <p className="text-[13px] text-slate-400">
                  If officer comp were properly classified, your DSCR could be{" "}
                  <span className={`font-mono font-semibold ${dscrColor(maxDscr)}`}>
                    {maxDscr.toFixed(2)}x
                  </span>{" "}
                  instead of{" "}
                  <span className="font-mono">{adjDscr.toFixed(2)}x</span>
                </p>
              </div>
            )}

            {/* Addback Breakdown */}
            {addbackItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white">
                  Addback Breakdown
                </h3>
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 divide-y divide-slate-700/50">
                  {addbackItems.map((item) => (
                    <div key={item.name} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.dotColor}`} />
                          <span className="text-[15px] font-medium text-white">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[15px] font-mono font-semibold text-white">
                          {fmt(item.amount)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 pl-5">
                        <span className={`text-[13px] font-medium ${item.statusColor}`}>
                          {item.accepted ? "ACCEPTED" : item.statusColor.includes("red") ? "REJECTED" : "NOT ACCEPTED"}
                        </span>
                        <span className="text-[13px] text-slate-400">
                          — {item.status.split("—")[1]?.trim() || item.status}
                        </span>
                      </div>
                      {item.fix && (
                        <p className="text-[13px] text-cyan-400 pl-5">
                          Fix: {item.fix}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="p-4 flex flex-wrap items-center gap-4">
                    <span className="text-[14px] text-slate-400">
                      Total Addbacks:{" "}
                      <span className="text-white font-mono font-semibold">
                        {fmt(totalAddbacks)}
                      </span>
                    </span>
                    <span className="text-[14px] text-emerald-400">
                      Banks Accept:{" "}
                      <span className="font-mono font-semibold">
                        {fmt(acceptedAddbacks)}
                      </span>
                    </span>
                    <span className="text-[14px] text-red-400">
                      Banks Reject:{" "}
                      <span className="font-mono font-semibold">
                        {fmt(rejectedAddbacks)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Three DSCR Views */}
            {totalDebt > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white">DSCR Views</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Tax Return DSCR",
                      sublabel: "Net income only",
                      dscr: taxDscr,
                    },
                    {
                      label: "Adjusted DSCR",
                      sublabel: "With accepted addbacks",
                      dscr: adjDscr,
                    },
                    {
                      label: "Max Possible DSCR",
                      sublabel: "If all items reclassified",
                      dscr: maxDscr,
                    },
                  ].map((v) => (
                    <div
                      key={v.label}
                      className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 space-y-3"
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-white">
                          {v.label}
                        </p>
                        <p className="text-[12px] text-slate-500">{v.sublabel}</p>
                      </div>
                      <p className={`text-3xl font-bold font-mono ${dscrColor(v.dscr)}`}>
                        {v.dscr.toFixed(2)}x
                      </p>
                      <p className={`text-[13px] font-medium ${dscrColor(v.dscr)}`}>
                        {dscrLabel(v.dscr)}
                      </p>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${dscrBarGradient(v.dscr)} transition-all duration-700`}
                          style={{
                            width: `${Math.min((v.dscr / 2) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white">
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border ${rec.bg} p-5 space-y-2`}
                    >
                      <span
                        className={`inline-block text-[11px] font-bold uppercase tracking-wider ${rec.color}`}
                      >
                        {rec.level}
                      </span>
                      <p className="text-[14px] text-slate-300 leading-relaxed">
                        {rec.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Line */}
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 space-y-2">
              <h3 className="text-lg font-bold text-yellow-400">
                The Bottom Line
              </h3>
              <p className="text-[14px] text-slate-300 leading-relaxed">
                {bottomLine}
              </p>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Want a Complete Eligibility Breakdown?
              </h2>
              <p className="text-slate-400 text-[15px] max-w-md mx-auto">
                Get the full Bank Ready Blueprint — a personalized report with
                lender matching, document checklists, and step-by-step action
                plan.
              </p>
              <a
                href="https://businesseligibility.com/checkout/bank-ready-blueprint"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-semibold text-slate-950 hover:bg-cyan-400 active:scale-[0.98] transition-all"
              >
                Get Bank Ready Blueprint — $999
              </a>
              <p className="text-[13px] text-slate-500">
                Payment plans available
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center">
        <p className="text-[13px] text-slate-600">
          Powered by{" "}
          <span className="text-slate-400 font-medium">
            Business Eligibility
          </span>
        </p>
      </footer>
    </div>
  );
}
