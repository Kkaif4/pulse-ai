import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pulse AI - NIFTY Options Trading Signal & PCR Sentiment Engine",
  description: "Real-time trading signal intelligence, Buyer Aggression Trend (CE vs PE), Max Pain levels, and PCR sentiment analysis for NIFTY Options.",
  keywords: ["NIFTY Options", "Trading Signals", "PCR Sentiment", "Buyer Aggression", "Max Pain Chart", "Options Analysis", "Pulse AI"],
  authors: [{ name: "Pulse AI Team" }],
  openGraph: {
    title: "Pulse AI - Options Trading Intelligence",
    description: "Real-time trading signals, PCR sentiment engine, and interactive option charts.",
    type: "website",
    locale: "en_US",
    siteName: "Pulse AI",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
