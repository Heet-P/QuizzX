// Restyled to match QuizzX's editorial design system (design_idea/DesignPhilo.md) —
// warm cream surfaces, electric blue accent, large soft rounded cards, Clash
// Display headings. Typed structurally against ClerkProvider's `appearance`
// prop (Clerk v7 doesn't expose a standalone `Appearance` type from a stable
// top-level package export).
export const clerkAppearance = {
  layout: {
    socialButtonsPlacement: "bottom" as const,
  },
  variables: {
    colorPrimary: "#2b4eff",
    colorText: "#14120f",
    colorBackground: "#f8f5ef",
    colorInputBackground: "#ffffff",
    fontFamily: '"General Sans", sans-serif',
    borderRadius: "18px",
    colorTextOnPrimaryBackground: "#ffffff",
  },
  elements: {
    cardBox: "rounded-[32px] shadow-xl bg-cream border-0",
    card: "bg-transparent shadow-none rounded-none p-6 sm:p-8",
    headerTitle: "font-display font-medium tracking-tight text-3xl",
    headerSubtitle: "font-sans text-ink/60",
    formButtonPrimary:
      "btn-tactile bg-blue text-white hover:bg-blue-deep w-full justify-center normal-case text-base",
    formFieldInput: "input-tactile",
    formFieldLabel: "font-accent font-bold text-sm text-ink/70",
    socialButtonsBlockButton:
      "rounded-[18px] border-2 border-ink/10 bg-white hover:bg-cream-alt w-full justify-center font-accent font-bold transition-colors",
    dividerLine: "bg-ink/10 h-px",
    dividerText: "text-ink/40 font-accent font-bold uppercase text-xs bg-cream px-2",
    footerActionText: "font-sans text-ink/60",
    footerActionLink: "text-blue font-bold hover:text-purple transition-colors",
    identityPreview: "rounded-[18px] bg-white border-2 border-ink/10 shadow-none",
    identityPreviewEditButtonIcon: "text-ink",
    formResendCodeLink: "text-blue font-bold hover:text-purple transition-colors",
    otpCodeFieldInput: "input-tactile",
  },
};
