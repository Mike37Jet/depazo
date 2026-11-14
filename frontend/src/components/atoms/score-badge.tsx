import { joinClassNames } from "../class-names";

export type ScoreTone = "high" | "mid" | "low";

const EXCELLENT_SCORE = 90;
const HIGH_SCORE = 80;
const MID_SCORE = 60;

const TONE_CLASSES: Record<ScoreTone, string> = {
  high: "bg-score-high-tint text-score-high",
  mid: "bg-score-mid-tint text-score-mid",
  low: "bg-surface-2 text-label-2",
};

export function scoreTone(score: number): ScoreTone {
  if (score >= HIGH_SCORE) {
    return "high";
  }
  if (score >= MID_SCORE) {
    return "mid";
  }
  return "low";
}

export function scoreRating(score: number): string {
  if (score >= EXCELLENT_SCORE) {
    return "Excelente";
  }
  if (score >= HIGH_SCORE) {
    return "Muy buena";
  }
  if (score >= MID_SCORE) {
    return "Buena";
  }
  return "Baja";
}

export function ScoreBadge({ score }: { score: number }) {
  const rating = scoreRating(score);
  return (
    <div
      role="img"
      aria-label={`Compatibilidad ${score} de 100, ${rating.toLowerCase()}`}
      className={joinClassNames(
        "inline-grid min-w-13 justify-items-center gap-px rounded-md px-2 py-1.5",
        TONE_CLASSES[scoreTone(score)],
      )}
    >
      <b className="text-title-3 font-bold tabular-nums">{score}</b>
      <span className="text-caption-2">{rating}</span>
    </div>
  );
}
