import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { geistPixel, anekDevanagari, satoshi } from "@/lib/fonts";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getClerkFrontendApiHost } from "@/lib/clerk-frontend-api";
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
  const clerkHost = getClerkFrontendApiHost();

  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${geistPixel.variable} ${anekDevanagari.variable} ${satoshi.variable}`}
      >
        {/* Warms the connection to Clerk's Frontend API ahead of time — its
            UserButton/sign-in UI is lazily fetched on first interaction, and
            this preconnect (a documented Clerk perf recommendation) shaves
            the DNS+TLS handshake off that first click's latency. */}
        {clerkHost && (
          <head>
            <link rel="preconnect" href={`https://${clerkHost}`} />
            <link rel="dns-prefetch" href={`https://${clerkHost}`} />
          </head>
        )}
        <body>
          <IntroLoader />
          <SmoothScroll />
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
