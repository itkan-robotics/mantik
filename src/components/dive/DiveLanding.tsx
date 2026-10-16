import type { DiveRosterTeam } from '@/lib/dive/types';

interface Props {
  dailyTeam: DiveRosterTeam | null;
  onStart: () => void;
}

export default function DiveLanding({ dailyTeam, onStart }: Props) {
  const repoSlug = dailyTeam?.linkToCodebases?.trim();
  const repoUrl = repoSlug ? `https://github.com/${repoSlug}` : null;
  const fileName = dailyTeam?.chosenFile.split('/').pop();

  return (
    <div className="dive-app dive-landing">
      <div className="lesson-content" data-pagefind-body>
        <h1>The Trenches</h1>
        <p>
          Five timed prompts on FRC and WPILib programming. Type one valid answer per question — less
          obvious correct answers score more. Your total score scrolls a real public robot entry file on the
          right as a depth meter only; you are not quizzed on that code.
        </p>

        <div className="rules-box">
          <h3>How it works</h3>
          <ul>
            <li>Everyone gets the same five prompts each day.</li>
            <li>Rarer accepted answers earn more points and pull the backdrop farther down the file.</li>
            <li>The code panel is atmosphere and curiosity — trivia comes from general FRC knowledge.</li>
          </ul>
        </div>

        {dailyTeam ? (
          <div className="rules-box dive-daily">
            <h3>Today&apos;s backdrop</h3>
            <p>
              Team {dailyTeam.teamNumber} — {dailyTeam.teamName}:{' '}
              <code>{fileName}</code> ({dailyTeam.lineCount} lines). Same file for all players today.
            </p>
            {repoUrl ? (
              <p>
                <a href={repoUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
                {' · '}
                <a href="/frc/2026-public-repositories">2026 public repositories</a>
              </p>
            ) : null}
            <button type="button" className="dive-primary-btn" onClick={onStart}>
              Start today&apos;s run
            </button>
          </div>
        ) : (
          <p className="dive-error">Backdrop roster missing. Run npm run fetch:dive-teams.</p>
        )}
      </div>
    </div>
  );
}
