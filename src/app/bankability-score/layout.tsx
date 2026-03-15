import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bankability Score Calculator | Business Eligibility",
  description:
    "Your comprehensive funding readiness score across all 6 dimensions banks evaluate.",
};

export default function BankabilityScoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
