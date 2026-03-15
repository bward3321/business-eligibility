import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Impact Simulator | Business Eligibility",
  description:
    "See how your tax strategy is helping or hurting your loan eligibility — and exactly what to reclassify to maximize your bankable income.",
};

export default function TaxImpactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
