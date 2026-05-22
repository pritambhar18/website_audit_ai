import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QA-Auditor Web Diagnostics — Automated Website QA & Responsive Testing",
  description:
    "Enterprise-grade AI-powered website auditing tool. Checks links, captures multi-device screenshots, analyzes SEO & security, and generates a downloadable PDF report.",
  keywords: "website audit, responsive testing, SEO checker, security audit, broken links, PDF report",
  authors: [{ name: "QA-Auditor" }],
  openGraph: {
    title: "QA-Auditor Web Diagnostics",
    description: "Enterprise-grade website auditing: screenshots, SEO, security, links, PDF report.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
