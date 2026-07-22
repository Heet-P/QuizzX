import { LandingNav } from "@/components/LandingNav";
import { TopHUD } from "@/components/landing/TopHUD";
import { SidebarNav } from "@/components/landing/SidebarNav";
import { AuthCTA } from "@/components/landing/AuthCTA";
import { MosaicHero } from "@/components/landing/MosaicHero";
import { CategoryMarquee } from "@/components/landing/CategoryMarquee";
import { FeatureMosaic } from "@/components/landing/FeatureMosaic";
import { LiveStats } from "@/components/landing/LiveStats";
import { BattleMode } from "@/components/landing/BattleMode";
import { AIAssistant } from "@/components/landing/AIAssistant";
import { AchievementGallery } from "@/components/landing/AchievementGallery";
import { LeaderboardPreview } from "@/components/landing/LeaderboardPreview";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { SiteFooter } from "@/components/landing/SiteFooter";

// Full 12-section landing page per design_idea/DesignPhilo.md. Structure
// restructured after explicit follow-up feedback referencing units.gr
// directly: numbered index nav + asymmetric mosaic cards instead of a
// conventional hero. The index nav (SidebarNav) used to be a permanently
// visible left rail, but keeping a sticky sidebar pinned for the whole page
// *and* correctly sized at every scroll position/viewport height turned
// into a losing battle (sticky containing-block quirks, grid row
// inflation, natural-vs-stuck offset mismatches, empty space below its own
// content). It's a dropdown now — a small `sticky` trigger button + a
// full-screen overlay — which needs none of that coordination, so the page
// is back to a single-width column instead of a sidebar-reserved grid.
export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-cream font-sans text-ink">
      <LandingNav />

      <div className="max-w-[1600px] mx-auto pl-4 sm:pl-6 pr-3 sm:pr-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <SidebarNav />
          <AuthCTA />
        </div>

        <TopHUD />

        <div className="flex flex-col gap-3 lg:gap-4">
          <MosaicHero />
          <CategoryMarquee />
          <div id="features">
            <FeatureMosaic />
          </div>
          <div id="stats">
            <LiveStats />
          </div>
          <div id="battle">
            <BattleMode />
          </div>
          <div id="ai">
            <AIAssistant />
          </div>
          <div id="achievements">
            <AchievementGallery />
          </div>
          <div id="leaderboard">
            <LeaderboardPreview />
          </div>
          <div id="testimonials">
            <Testimonials />
          </div>
          <div id="faq">
            <FAQ />
          </div>
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
