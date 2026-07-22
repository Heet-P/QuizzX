import { Sparkle } from "lucide-react";

const CATEGORIES = [
  "Science",
  "History",
  "Coding",
  "Movies",
  "Sports",
  "Geography",
  "AI",
  "Anime",
  "Math",
  "Design",
  "Languages",
];

// Section 2: Scrolling marquee. Pure CSS animation (not Framer) — infinite
// marquees are cheaper and smoother driven by CSS than by JS/Framer per-frame.
// Category text and star glyphs are separate flat flex children with one
// consistent gap throughout, so each star sits centered between the two
// words either side of it instead of hugging whichever word came first.
export function CategoryMarquee() {
  const items = [...CATEGORIES, ...CATEGORIES];

  return (
    <div className="rounded-[var(--radius-card-sm)] border-2 border-ink bg-ink py-[clamp(0.5rem,1dvh,0.75rem)] overflow-hidden">
      <div className="flex items-center w-max gap-6 px-6 animate-marquee">
        {items.map((cat, i) => (
          <div key={i} className="flex items-center gap-6 shrink-0">
            <span className="font-display font-medium text-xl sm:text-2xl text-white/90 whitespace-nowrap">
              {cat}
            </span>
            <Sparkle size={16} className="text-yellow fill-yellow shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
