import localFont from "next/font/local";

// Self-hosted Fontshare fonts (see design_idea/DesignPhilo.md) — free-tier
// woff2 files downloaded from Fontshare's CDN into app/fonts/.

export const clashDisplay = localFont({
  src: [
    { path: "../app/fonts/clash-display-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/clash-display-500.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/clash-display-600.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/clash-display-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-clash-display",
  display: "swap",
});

export const generalSans = localFont({
  src: [
    { path: "../app/fonts/general-sans-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/general-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/general-sans-600.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/general-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
});

export const satoshi = localFont({
  src: [
    { path: "../app/fonts/satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "../app/fonts/satoshi-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

// Self-hosted Google Fonts, downloaded from fonts.gstatic.com per explicit
// request. Geist Pixel is single-weight (400) only.
export const geistPixel = localFont({
  src: [{ path: "../app/fonts/geist-pixel-400.ttf", weight: "400", style: "normal" }],
  variable: "--font-geist-pixel",
  display: "swap",
});

export const anekDevanagari = localFont({
  src: [
    { path: "../app/fonts/anek-devanagari-100.ttf", weight: "100", style: "normal" },
    { path: "../app/fonts/anek-devanagari-200.ttf", weight: "200", style: "normal" },
    { path: "../app/fonts/anek-devanagari-300.ttf", weight: "300", style: "normal" },
    { path: "../app/fonts/anek-devanagari-400.ttf", weight: "400", style: "normal" },
    { path: "../app/fonts/anek-devanagari-500.ttf", weight: "500", style: "normal" },
    { path: "../app/fonts/anek-devanagari-600.ttf", weight: "600", style: "normal" },
    { path: "../app/fonts/anek-devanagari-700.ttf", weight: "700", style: "normal" },
    { path: "../app/fonts/anek-devanagari-800.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-anek-devanagari",
  display: "swap",
});
