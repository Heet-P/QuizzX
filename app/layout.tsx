import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { geistPixel, anekDevanagari, satoshi } from "@/lib/fonts";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { ToastProvider } from "@/components/Toast";
import { SmoothScroll } from "@/components/SmoothScroll";
import { IntroLoader } from "@/components/IntroLoader";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizzX — Compete. Learn. Repeat.",
  description:
    "An AI-powered competitive quiz platform where you learn, battle friends, climb rankings, and earn achievements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${geistPixel.variable} ${anekDevanagari.variable} ${satoshi.variable}`}
      >
        <body>
          <IntroLoader />
          <SmoothScroll />
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
