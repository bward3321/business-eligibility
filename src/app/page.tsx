import Link from "next/link";

const CALCULATORS = [
  {
    href: "/dscr-calculator",
    title: "DSCR Calculator",
    description:
      "Calculate your Debt Service Coverage Ratio to see if your business qualifies for financing.",
    icon: "📊",
  },
  {
    href: "/payment-estimator",
    title: "Loan Payment Estimator",
    description:
      "Estimate monthly payments across SBA, bank, equipment, and other business loan types.",
    icon: "💰",
  },
  {
    href: "/global-debt-service",
    title: "Global Debt Service Calculator",
    description:
      "See the full picture lenders evaluate — business and personal debt obligations combined.",
    icon: "🌐",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header badge */}
      <div className="flex justify-center pt-6 pb-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Business Eligibility
        </span>
      </div>

      <main className="mx-auto max-w-2xl px-4 pt-16 sm:pt-24 pb-20 flex-1 flex flex-col items-center">
        {/* Title */}
        <div className="text-center space-y-4 mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Business Eligibility
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-md mx-auto">
            Know exactly where you stand with lenders
          </p>
        </div>

        {/* Calculator links */}
        <div className="w-full space-y-4">
          {CALCULATORS.map((calc) => (
            <Link
              key={calc.href}
              href={calc.href}
              className="block rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 sm:p-8 transition-all hover:border-cyan-500/30 hover:bg-slate-800/40 group"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{calc.icon}</span>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {calc.title}
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {calc.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 pt-1">
                    Open calculator
                    <span className="transition-transform group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
