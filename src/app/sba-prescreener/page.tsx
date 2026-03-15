"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Option {
  label: string;
  score: number;
  restricted?: boolean;
}

interface Question {
  id: string;
  title: string;
  options: Option[];
}

interface ProgramResult {
  name: string;
  tagline: string;
  maxAmount: string;
  status: "eligible" | "borderline" | "ineligible";
  score: number;
  strengths: string[];
  issues: string[];
}

/* ------------------------------------------------------------------ */
/*  Questions                                                          */
/* ------------------------------------------------------------------ */

const QUESTIONS: Question[] = [
  {
    id: "timeInBusiness",
    title: "How long has your business been operating?",
    options: [
      { label: "Under 6 months", score: 15 },
      { label: "6–12 months", score: 35 },
      { label: "1–2 years", score: 55 },
      { label: "2–5 years", score: 80 },
      { label: "5+ years", score: 95 },
    ],
  },
  {
    id: "annualRevenue",
    title: "What is your annual revenue?",
    options: [
      { label: "Under $100K", score: 20 },
      { label: "$100K–$250K", score: 40 },
      { label: "$250K–$500K", score: 60 },
      { label: "$500K–$1M", score: 80 },
      { label: "$1M+", score: 95 },
    ],
  },
  {
    id: "creditScore",
    title: "What is your personal credit score range?",
    options: [
      { label: "Below 600", score: 10 },
      { label: "600–649", score: 30 },
      { label: "650–679", score: 55 },
      { label: "680–719", score: 75 },
      { label: "720+", score: 95 },
    ],
  },
  {
    id: "entityType",
    title: "What is your business entity type?",
    options: [
      { label: "Sole Proprietorship", score: 40 },
      { label: "LLC", score: 75 },
      { label: "S-Corp", score: 85 },
      { label: "C-Corp", score: 90 },
      { label: "Partnership", score: 65 },
    ],
  },
  {
    id: "industry",
    title: "What industry is your business in?",
    options: [
      { label: "Professional Services", score: 90 },
      { label: "Healthcare", score: 85 },
      { label: "Construction", score: 75 },
      { label: "Retail", score: 70 },
      { label: "Food & Beverage", score: 65 },
      { label: "Transportation", score: 70 },
      { label: "Real Estate Investing", score: 20, restricted: true },
      { label: "Cannabis", score: 5, restricted: true },
      { label: "Gambling", score: 5, restricted: true },
      { label: "Other", score: 60 },
    ],
  },
  {
    id: "existingDebt",
    title: "How much existing business debt do you carry?",
    options: [
      { label: "None", score: 95 },
      { label: "Under $50K", score: 75 },
      { label: "$50K–$150K", score: 55 },
      { label: "$150K–$500K", score: 35 },
      { label: "$500K+", score: 20 },
    ],
  },
  {
    id: "cashFlow",
    title: "How would you describe your cash flow?",
    options: [
      { label: "Profitable consistently", score: 95 },
      { label: "Seasonal but positive", score: 65 },
      { label: "Breakeven", score: 35 },
      { label: "Showing a loss", score: 10 },
    ],
  },
  {
    id: "collateral",
    title: "What collateral can you offer?",
    options: [
      { label: "Real estate", score: 85 },
      { label: "Equipment", score: 65 },
      { label: "Both real estate & equipment", score: 95 },
      { label: "Neither", score: 20 },
    ],
  },
  {
    id: "previousDeclines",
    title: "Have you been declined for business funding before?",
    options: [
      { label: "No", score: 90 },
      { label: "Yes, once", score: 50 },
      { label: "Yes, multiple times", score: 20 },
    ],
  },
  {
    id: "fundingNeed",
    title: "How much funding do you need?",
    options: [
      { label: "Under $50K", score: 80 },
      { label: "$50K–$150K", score: 75 },
      { label: "$150K–$350K", score: 65 },
      { label: "$350K–$1M", score: 50 },
      { label: "$1M+", score: 40 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Scoring helpers                                                    */
/* ------------------------------------------------------------------ */

function computeOverallScore(answers: Record<string, number>): number {
  const weights: Record<string, number> = {
    timeInBusiness: 0.12,
    annualRevenue: 0.12,
    creditScore: 0.18,
    entityType: 0.05,
    industry: 0.13,
    existingDebt: 0.08,
    cashFlow: 0.15,
    collateral: 0.07,
    previousDeclines: 0.05,
    fundingNeed: 0.05,
  };
  let total = 0;
  for (const key of Object.keys(weights)) {
    total += (answers[key] ?? 0) * weights[key];
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

/* ------------------------------------------------------------------ */
/*  SBA program evaluation                                             */
/* ------------------------------------------------------------------ */

function evaluatePrograms(
  answers: Record<string, number>,
  labels: Record<string, string>
): ProgramResult[] {
  const credit = answers.creditScore ?? 0;
  const time = answers.timeInBusiness ?? 0;
  const cashFlow = answers.cashFlow ?? 0;
  const industry = answers.industry ?? 0;
  const collateral = answers.collateral ?? 0;
  const fundingNeed = answers.fundingNeed ?? 0;
  const revenue = answers.annualRevenue ?? 0;
  const debt = answers.existingDebt ?? 0;

  const isRestricted = industry <= 20;
  const fundingLabel = labels.fundingNeed ?? "";

  // Helpers
  const strengths = (checks: [boolean, string][]): string[] =>
    checks.filter(([ok]) => ok).map(([, msg]) => msg);
  const issues = (checks: [boolean, string][]): string[] =>
    checks.filter(([ok]) => ok).map(([, msg]) => msg);

  // --- SBA 7(a) ---
  const sba7aScore = isRestricted
    ? 5
    : Math.round(credit * 0.3 + time * 0.2 + cashFlow * 0.2 + revenue * 0.15 + debt * 0.15);
  const sba7a: ProgramResult = {
    name: "SBA 7(a) Loan",
    tagline: "Up to $5M — most versatile SBA loan for working capital, expansion & more",
    maxAmount: "$5,000,000",
    score: sba7aScore,
    status: isRestricted ? "ineligible" : sba7aScore >= 65 ? "eligible" : sba7aScore >= 40 ? "borderline" : "ineligible",
    strengths: strengths([
      [credit >= 75, "Strong credit profile"],
      [time >= 55, "Sufficient time in business"],
      [cashFlow >= 65, "Healthy cash flow"],
      [revenue >= 60, "Revenue supports loan size"],
      [debt <= 55, "Manageable existing debt"],
    ]),
    issues: issues([
      [credit < 55, "Credit score below SBA preferred minimum"],
      [time < 35, "Less than 2 years in business"],
      [cashFlow < 35, "Cash flow concerns"],
      [isRestricted, "Industry is SBA-restricted"],
      [fundingLabel.includes("1M"), "Large loan amount requires strong application"],
    ]),
  };

  // --- SBA 504 ---
  const sba504Score = isRestricted
    ? 5
    : Math.round(collateral * 0.3 + credit * 0.2 + time * 0.15 + cashFlow * 0.2 + revenue * 0.15);
  const needsRealEstate = collateral >= 65;
  const sba504: ProgramResult = {
    name: "SBA 504 Loan",
    tagline: "Up to $5.5M — for real estate purchases & major equipment",
    maxAmount: "$5,500,000",
    score: isRestricted ? 5 : !needsRealEstate ? Math.min(sba504Score, 35) : sba504Score,
    status: isRestricted
      ? "ineligible"
      : !needsRealEstate
      ? "ineligible"
      : sba504Score >= 65
      ? "eligible"
      : sba504Score >= 40
      ? "borderline"
      : "ineligible",
    strengths: strengths([
      [collateral >= 85, "Strong collateral position"],
      [credit >= 75, "Credit meets 504 standards"],
      [time >= 55, "Established operating history"],
      [cashFlow >= 65, "Positive cash flow trend"],
    ]),
    issues: issues([
      [collateral < 65, "504 loans require real estate or major equipment collateral"],
      [credit < 55, "Credit score below 504 threshold"],
      [time < 35, "Insufficient operating history"],
      [isRestricted, "Industry is SBA-restricted"],
    ]),
  };

  // --- SBA Microloan ---
  const microScore = isRestricted
    ? 5
    : Math.round(credit * 0.2 + time * 0.15 + cashFlow * 0.25 + revenue * 0.15 + debt * 0.1 + fundingNeed * 0.15);
  const wantsSmall = fundingNeed >= 75;
  const sbaMicro: ProgramResult = {
    name: "SBA Microloan",
    tagline: "Up to $50K — more flexible terms, ideal for startups & small needs",
    maxAmount: "$50,000",
    score: isRestricted ? 5 : microScore,
    status: isRestricted ? "ineligible" : microScore >= 55 ? "eligible" : microScore >= 30 ? "borderline" : "ineligible",
    strengths: strengths([
      [wantsSmall, "Funding need fits microloan range"],
      [true, "More flexible credit requirements"],
      [time < 55, "Startups welcome in microloan program"],
      [cashFlow >= 35, "Cash flow adequate for small loan"],
    ]),
    issues: issues([
      [!wantsSmall, "Funding need may exceed $50K microloan cap"],
      [cashFlow < 35, "Cash flow may not support repayment"],
      [isRestricted, "Industry is SBA-restricted"],
    ]),
  };

  // --- SBA Express ---
  const expressScore = isRestricted
    ? 5
    : Math.round(credit * 0.3 + time * 0.2 + cashFlow * 0.2 + revenue * 0.15 + debt * 0.15);
  const sbaExpress: ProgramResult = {
    name: "SBA Express",
    tagline: "Up to $500K — faster processing & approval turnaround",
    maxAmount: "$500,000",
    score: isRestricted ? 5 : expressScore,
    status: isRestricted ? "ineligible" : expressScore >= 60 ? "eligible" : expressScore >= 35 ? "borderline" : "ineligible",
    strengths: strengths([
      [credit >= 75, "Credit score supports Express approval"],
      [time >= 55, "Operating history meets Express criteria"],
      [cashFlow >= 65, "Strong cash flow for faster underwriting"],
      [revenue >= 60, "Revenue supports Express loan size"],
    ]),
    issues: issues([
      [credit < 55, "Express loans typically need 680+ credit"],
      [time < 35, "Limited operating history slows Express approval"],
      [cashFlow < 35, "Weak cash flow may disqualify from Express"],
      [isRestricted, "Industry is SBA-restricted"],
    ]),
  };

  return [sba7a, sba504, sbaMicro, sbaExpress];
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */

function AnimatedScore({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(0);

  useEffect(() => {
    const start = animatedRef.current;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      if (ref.current) ref.current.textContent = String(current);
      animatedRef.current = current;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);

  return <span ref={ref} className={className}>0</span>;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SbaPrescreener() {
  const [step, setStep] = useState(0); // 0..9 = questions, 10 = results
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isResults = step === QUESTIONS.length;
  const overallScore = computeOverallScore(answers);
  const programs = evaluatePrograms(answers, labels);

  const selectAnswer = useCallback(
    (questionId: string, option: Option) => {
      if (animating) return;
      setAnswers((prev) => ({ ...prev, [questionId]: option.score }));
      setLabels((prev) => ({ ...prev, [questionId]: option.label }));
      setDirection("forward");
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setAnimating(false);
      }, 300);
    },
    [animating]
  );

  const goBack = useCallback(() => {
    if (animating || step === 0) return;
    setDirection("back");
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 200);
  }, [animating, step]);

  const restart = useCallback(() => {
    setAnswers({});
    setLabels({});
    setStep(0);
    setDirection("forward");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Scroll to top on results
  useEffect(() => {
    if (isResults) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isResults]);

  /* ----- weakest areas for "What's Holding You Back" ----- */
  const weakAreas = Object.entries(answers)
    .map(([key, score]) => ({
      key,
      score,
      label: QUESTIONS.find((q) => q.id === key)?.title.replace("?", "") ?? key,
      answer: labels[key] ?? "",
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  const fixRecommendations: Record<string, string> = {
    timeInBusiness: "Continue operating and building business history. SBA lenders strongly prefer 2+ years.",
    annualRevenue: "Focus on growing top-line revenue. Consider strategies to increase sales volume before applying.",
    creditScore: "Work on improving personal credit — pay down balances, dispute errors, avoid new hard inquiries.",
    entityType: "Consider forming an LLC or S-Corp for stronger SBA applications and liability protection.",
    industry: "SBA restricts certain industries. If you're in a restricted category, explore alternative lending options.",
    existingDebt: "Pay down existing obligations to improve your debt-to-income ratio before applying.",
    cashFlow: "Demonstrate consistent profitability over 12+ months. Reduce unnecessary expenses.",
    collateral: "Identify assets that can serve as collateral — real estate, equipment, or accounts receivable.",
    previousDeclines: "Address reasons for prior declines before reapplying. Consider working with an SBA-approved lender.",
    fundingNeed: "Consider phased funding — start with a smaller loan to build a track record, then scale up.",
  };

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

      <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-20 flex-1">
        {/* ---------- QUIZ PHASE ---------- */}
        {!isResults && (
          <>
            {/* Title */}
            <div className="text-center space-y-3 mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                SBA Eligibility Pre-Screener
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                Answer 10 quick questions to see which SBA loan programs you may
                qualify for — in under 2 minutes.
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                <span>Question {step + 1} of 10</span>
                <span>{Math.round(((step) / 10) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500 ease-out"
                  style={{ width: `${((step + 1) / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Back button */}
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}

            {/* Question card */}
            <div
              ref={containerRef}
              key={step}
              className={`animate-[fadeUp_0.35s_ease-out] space-y-3`}
            >
              <h2 className="text-xl font-semibold text-white mb-5">
                {QUESTIONS[step].title}
              </h2>
              <div className="space-y-2.5">
                {QUESTIONS[step].options.map((option) => {
                  const selected = labels[QUESTIONS[step].id] === option.label;
                  return (
                    <button
                      key={option.label}
                      onClick={() => selectAnswer(QUESTIONS[step].id, option)}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                        selected
                          ? "border-cyan-500 bg-cyan-500/10 text-white"
                          : "border-slate-700/50 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="font-medium">{option.label}</span>
                        {option.restricted && (
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                            SBA Restricted
                          </span>
                        )}
                        {selected && (
                          <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ---------- RESULTS PHASE ---------- */}
        {isResults && (
          <div className="animate-[fadeUp_0.5s_ease-out] space-y-8">
            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Your SBA Readiness Results
              </h1>
              <p className="text-slate-400 text-sm">
                Based on your responses, here&rsquo;s where you stand.
              </p>
            </div>

            {/* Overall score card */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-8 text-center space-y-5">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Overall SBA Readiness Score
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className={`text-6xl sm:text-7xl font-bold font-mono ${gradeColor(overallScore)}`}>
                  <AnimatedScore value={overallScore} />
                </span>
                <span className={`text-3xl font-bold border rounded-xl px-4 py-2 ${gradeBg(overallScore)}`}>
                  {letterGrade(overallScore)}
                </span>
              </div>
              {/* Gauge bar */}
              <div className="max-w-md mx-auto">
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barGradient(overallScore)} transition-all duration-1000 ease-out`}
                    style={{ width: `${overallScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* SBA Program Cards */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">SBA Program Eligibility</h2>
              <div className="space-y-4">
                {programs.map((prog) => (
                  <div
                    key={prog.name}
                    className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{prog.name}</h3>
                        <p className="text-sm text-slate-400">{prog.tagline}</p>
                      </div>
                      <span
                        className={`inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          prog.status === "eligible"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : prog.status === "borderline"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {prog.status === "eligible"
                          ? "Likely Eligible"
                          : prog.status === "borderline"
                          ? "Borderline"
                          : "Not Eligible"}
                      </span>
                    </div>

                    {/* Score bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
                        <span>Program fit score</span>
                        <span>{prog.score}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGradient(prog.score)} transition-all duration-700`}
                          style={{ width: `${prog.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Strengths & Issues */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {prog.strengths.length > 0 && (
                        <div className="space-y-1.5">
                          {prog.strengths.map((s) => (
                            <div key={s} className="flex items-start gap-2 text-sm">
                              <span className="text-emerald-400 mt-0.5">✓</span>
                              <span className="text-slate-300">{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {prog.issues.length > 0 && (
                        <div className="space-y-1.5">
                          {prog.issues.map((i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-orange-400 mt-0.5">!</span>
                              <span className="text-slate-300">{i}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Holding You Back */}
            {weakAreas.length > 0 && weakAreas[0].score < 70 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-4">
                  What&rsquo;s Holding You Back
                </h2>
                <div className="space-y-3">
                  {weakAreas
                    .filter((a) => a.score < 70)
                    .map((area) => (
                      <div
                        key={area.key}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            {area.label}
                          </span>
                          <span className={`text-sm font-mono font-semibold ${gradeColor(area.score)}`}>
                            {area.score}/100
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barGradient(area.score)}`}
                            style={{ width: `${area.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400">
                          You answered: <span className="text-slate-300">{area.answer}</span>
                        </p>
                        <p className="text-xs text-cyan-400">
                          {fixRecommendations[area.key]}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Your Answers Summary */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Your Answers</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {QUESTIONS.map((q) => {
                  const score = answers[q.id] ?? 0;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 truncate">
                          {q.title.replace("?", "")}
                        </p>
                        <p className="text-sm font-medium text-white truncate">
                          {labels[q.id]}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${gradeBg(score)}`}
                      >
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                Want a Complete Eligibility Breakdown?
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Get the full Bank Ready Blueprint — a personalized report with
                lender matching, document checklists, and step-by-step action plan.
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
                onClick={restart}
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
          <span className="text-slate-400 font-medium">Business Eligibility</span>
        </p>
      </footer>
    </div>
  );
}
