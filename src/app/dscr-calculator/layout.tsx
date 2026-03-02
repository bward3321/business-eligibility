import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DSCR Calculator | Business Eligibility",
  description:
    "Calculate your Debt Service Coverage Ratio and see exactly where you stand with lenders.",
};

export default function DSCRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
