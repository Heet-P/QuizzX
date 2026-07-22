// Ported from client/src/pages/QuizPage.jsx's inline WatermarkOverlay.
export function WatermarkOverlay({ username }: { username: string }) {
  if (!username) return null;
  const text = username.toUpperCase();
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <span
            key={`${row}-${col}`}
            className="absolute text-xs font-bold text-ink/[0.06] whitespace-nowrap"
            style={{
              top: `${row * 18 + 5}%`,
              left: `${col * 28 - 5}%`,
              transform: "rotate(-25deg)",
            }}
          >
            {text}
          </span>
        ))
      )}
    </div>
  );
}
