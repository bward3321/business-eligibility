import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cash Flow Forecaster | Business Eligibility",
  description:
    "Project your cash flow 12 months out and see exactly when your numbers cross lender approval thresholds.",
};

export default function CashFlowForecasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
