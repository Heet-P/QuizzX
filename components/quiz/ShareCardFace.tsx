import { forwardRef, type CSSProperties } from "react";
import styles from "./ShareCard.module.css";
import { pctFor, paletteFor, type ShareCardData } from "@/lib/share-card";

interface ShareCardFaceProps extends ShareCardData {
  avatarFailed: boolean;
  onAvatarLoad: () => void;
  onAvatarError: () => void;
}

/** The actual visual card — rendered live for the on-screen preview and captured to PNG via html-to-image for download/share (see ShareCardModal). */
export const ShareCardFace = forwardRef<HTMLDivElement, ShareCardFaceProps>(function ShareCardFace(
  { username, avatarUrl, quizTitle, score, correct, total, streak, avatarFailed, onAvatarLoad, onAvatarError },
  ref
) {
  const pct = pctFor(correct, total);
  const { from, to, label, crown } = paletteFor(pct);
  const cardStyle = { "--band-from": from, "--band-to": to } as CSSProperties;

  return (
    <div ref={ref} className={styles.card} style={cardStyle}>
      <div className={styles.bgGrid} />
      <div className={styles.confetti} />

      <div className={styles.stamp}>{label.toUpperCase()}</div>

      <div className={styles.top}>
        <p>I JUST SCORED</p>
        <h1>
          {score} <span>pts</span>
        </h1>
      </div>

      <div className={`${styles.stats} ${styles.left}`}>
        <div className={styles.icon}>⭐</div>
        <div className={styles.label}>SCORE</div>
        <div className={styles.value}>
          {correct}/{total}
        </div>
        <div className={styles.small}>Correct</div>
      </div>

      <div className={styles.avatarWrap}>
        {crown && <div className={styles.crown}>👑</div>}
        {avatarUrl && !avatarFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- needs a real <img> with crossOrigin for html-to-image's canvas capture; next/image doesn't expose that attribute.
          <img className={styles.avatar} src={avatarUrl} alt="" crossOrigin="anonymous" onLoad={onAvatarLoad} onError={onAvatarError} />
        ) : (
          <div className={`${styles.avatar} ${styles.avatarFallback}`}>{(username[0] || "?").toUpperCase()}</div>
        )}
        <h2>{username}</h2>
      </div>

      <div className={`${styles.stats} ${styles.right}`}>
        <div className={styles.icon}>🔥</div>
        <div className={styles.label}>STREAK</div>
        <div className={styles.value}>{streak}</div>
        <div className={styles.small}>{streak === 1 ? "Day" : "Days"}</div>
      </div>

      <div className={styles.quiz}>
        <div className={styles.sub}>QUIZ</div>
        <h3>{quizTitle}</h3>
      </div>

      <svg className={styles.wave} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M0,80 C180,170 350,0 560,90 C760,175 980,20 1200,85 L1200,200 L0,200 Z" />
      </svg>

      <div className={styles.footer}>
        <div>
          <div className={styles.brand}>QUIZZX</div>
          <div className={styles.tag}>Learn. Play. Compete.</div>
        </div>
        <div className={styles.cta}>
          <div>Join me on QuizzX!</div>
          <div className={styles.pill}>🌐 quizzx.app</div>
        </div>
      </div>
    </div>
  );
});
