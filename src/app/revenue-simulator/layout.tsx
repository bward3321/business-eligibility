import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Team Revenue Simulator | Integrity Cap × Business Eligibility",
  description:
    "Internal sales team revenue simulator — model rep performance, commission structures, and revenue projections in real time.",
};

export default function RevenueSimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
