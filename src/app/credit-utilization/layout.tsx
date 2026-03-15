import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Utilization Optimizer | Business Eligibility",
  description:
    "See which cards are hurting your score the most and get an exact paydown plan to maximize your credit improvement.",
};

export default function CreditUtilizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
