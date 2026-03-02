import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Loan Payment Estimator | Business Eligibility",
  description:
    "Estimate monthly payments for SBA, bank, equipment, and other business loan types. Compare costs and see amortization schedules.",
};

export default function PaymentEstimatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
