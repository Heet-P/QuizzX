import { Timer, AlertTriangle, Flame, CheckCircle } from "lucide-react";
import type { QuizSettings } from "@/types/quiz";

// Ported from client/src/components/quiz/RulesScreen.jsx.
export function RulesScreen({ settings, onStart }: { settings: QuizSettings; onStart: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="card-tactile max-w-2xl w-full overflow-hidden">
        <div className="bg-yellow p-6">
          <h1 className="text-2xl sm:text-3xl font-display flex items-center gap-3">
            <AlertTriangle size={32} />
            Quiz Rules
          </h1>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[var(--radius-card-sm)] border-2 border-ink/10 p-4">
              <h3 className="font-accent font-bold text-sm uppercase mb-2 flex items-center gap-2 text-ink/60">
                <Timer size={16} /> Timer Duration
              </h3>
              <p className="text-xl font-display text-blue">
                {settings.timer === "global"
                  ? `${settings.duration} Minutes`
                  : settings.timer === "per_question"
                    ? `${settings.secondsPerQuestion}s / Question`
                    : "Untimed"}
              </p>
            </div>

            <div className="bg-white rounded-[var(--radius-card-sm)] border-2 border-ink/10 p-4">
              <h3 className="font-accent font-bold text-sm uppercase mb-2 flex items-center gap-2 text-ink/60">
                <AlertTriangle size={16} /> Tab Switching
              </h3>
              <p className={`text-xl font-display ${settings.tabSwitch === "disabled" ? "text-green" : "text-coral"}`}>
                {settings.tabSwitch === "auto_submit"
                  ? "Instant Fail"
                  : settings.tabSwitch === "three_strikes"
                    ? "3 Strikes Allowed"
                    : "Allowed"}
              </p>
            </div>
          </div>

          <div className="bg-ink text-white rounded-[var(--radius-card-sm)] p-6">
            <h3 className="font-display text-lg mb-2 flex items-center gap-2 text-yellow">
              <Flame size={20} /> Important
            </h3>
            <ul className="space-y-2 font-accent font-bold list-disc list-inside">
              <li>Starting the quiz will simulate fullscreen mode.</li>
              <li>Copying text is strictly prohibited.</li>
              <li>Do not reload the page or you may lose progress.</li>
            </ul>
          </div>

          <button onClick={onStart} className="btn-tactile w-full justify-center bg-green text-lg py-4">
            <CheckCircle size={22} />
            I Understand — Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
