import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SBA Eligibility Pre-Screener | Business Eligibility",
  description:
    "Answer 10 quick questions to see which SBA loan programs you may qualify for — in under 2 minutes.",
};

export default function SbaPrescreenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
