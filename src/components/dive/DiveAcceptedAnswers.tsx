import { TIER_LABELS, TIER_POINTS } from '@/lib/dive/tiers';
import type { DiveAnswer } from '@/lib/dive/types';

interface Props {
  answers: DiveAnswer[];
  /** Shown on the closed summary line. */
  summaryLabel?: string;
}

export default function DiveAcceptedAnswers({
  answers,
  summaryLabel = 'All accepted answers and point values (spoilers)',
}: Props) {
  return (
    <details className="dive-spoiler-details">
      <summary className="dive-spoiler-summary">{summaryLabel}</summary>
      <div className="dive-spoiler-body" aria-hidden={false}>
        <p className="dive-spoiler-hint">Opening this list shows every scored answer for this prompt.</p>
        <ul className="dive-accepted-list">
          {answers.map((a) => (
            <li key={a.text}>
              <span className="dive-accepted-answer">{a.text}</span>
              <span className="dive-accepted-meta">
                {TIER_LABELS[a.tier]} · {TIER_POINTS[a.tier]} pts
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
