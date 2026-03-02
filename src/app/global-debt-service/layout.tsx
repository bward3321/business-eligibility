import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global Debt Service Coverage Calculator | Business Eligibility",
  description:
    "Calculate your Global Debt Service Coverage ratio including personal and business obligations to see the full picture lenders evaluate.",
};

export default function GlobalDSCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
