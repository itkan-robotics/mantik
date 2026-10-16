import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DiveCodePanel from './DiveCodePanel';
import { suggestCloseAnswer, type CloseAnswerSuggestion } from '@/lib/dive/fuzzy';
import { depthLineForScore, matchPromptAnswer, roundDepthMeters } from '@/lib/dive/scoring';
import { dailySeedSuffix, pickPrompts } from '@/lib/dive/seed';
import { TIER_LABELS, depthMetersForPoints } from '@/lib/dive/tiers';
import type { DivePrompt, DivePromptPack, DiveRosterTeam, DiveRoundResult, DiveTeamMeta } from '@/lib/dive/types';
import DiveAcceptedAnswers from './DiveAcceptedAnswers';
import DiveRoundLessonLink from './DiveRoundLessonLink';
import { formatDiveLicense } from '@/lib/dive/formatLicense';

type Phase = 'read' | 'answer' | 'reveal' | 'summary';

interface Props {
  team: DiveRosterTeam;
  meta: DiveTeamMeta;
  source: string;
  pack: DivePromptPack;
  onExit: () => void;
}

function formatMs(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

export default function DivePlay({ team, meta, source, pack, onExit }: Props) {
  const roundCount = pack.roundCount;
  const maxPoints = pack.maxScorePerRun;

  const prompts = useMemo(() => {
    return pickPrompts(pack.prompts, roundCount, dailySeedSuffix());
  }, [pack.prompts, roundCount]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<DiveRoundResult[]>([]);
  const [readLeft, setReadLeft] = useState(pack.readDelayMs);
  const [answerLeft, setAnswerLeft] = useState(pack.answerMs);
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<CloseAnswerSuggestion | null>(null);
  const [lastTyped, setLastTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const inputValueRef = useRef('');
  const finishRoundRef = useRef<(raw: string, confirmedSuggestion?: string) => void>(() => {});

  const totalPoints = results.reduce((s, r) => s + r.points, 0);
  const depthLine = depthLineForScore(totalPoints, maxPoints, meta.lineCount);
  const totalDepthM = depthMetersForPoints(totalPoints);

  const backdropCaption = `#${team.teamNumber} ${team.teamName}`;
  const fileLabel = meta.chosenFile.split('/').pop() ?? 'Robot.java';

  const current: DivePrompt | undefined = prompts[roundIndex];

  const finishRound = useCallback(
    (raw: string, confirmedSuggestion?: string) => {
      if (!current || phase !== 'answer') return;
      const scoredRaw = confirmedSuggestion ?? raw;
      const { matched, points, matchedText } = matchPromptAnswer(current, scoredRaw);
      const cumulative = totalPoints + points;
      const line = depthLineForScore(cumulative, maxPoints, meta.lineCount);
      const row: DiveRoundResult = {
        promptId: current.id,
        prompt: current.prompt,
        userAnswer: raw.trim() || lastTyped.trim(),
        confirmedSuggestion,
        matchedText,
        tier: matched?.tier ?? null,
        points,
        depthMeters: roundDepthMeters(points),
        depthLine: line,
      };
      setResults((prev) => [...prev, row]);
      setSuggestion(null);
      setAnswerFeedback(null);
      setPhase('reveal');
    },
    [current, phase, totalPoints, maxPoints, meta.lineCount, lastTyped],
  );

  finishRoundRef.current = finishRound;

  const attemptAnswer = useCallback(
    (raw: string) => {
      if (!current || phase !== 'answer') return;
      const trimmed = raw.trim();
      if (!trimmed) {
        setAnswerFeedback('Type an answer, or wait for time to run out.');
        return;
      }

      setLastTyped(trimmed);
      setSuggestion(null);

      const match = matchPromptAnswer(current, trimmed);
      if (match.points > 0) {
        finishRound(trimmed);
        return;
      }

      const close = suggestCloseAnswer(current, trimmed);
      if (close) {
        setSuggestion(close);
        setAnswerFeedback(null);
        return;
      }

      setAnswerFeedback('Not in the answer bank — try another WPILib or FRC term.');
      setInput('');
    },
    [current, phase, finishRound],
  );

  const acceptSuggestion = useCallback(() => {
    if (!suggestion || phase !== 'answer') return;
    finishRound(lastTyped || input, suggestion.displayText);
    setInput('');
  }, [suggestion, phase, finishRound, lastTyped, input]);

  const dismissSuggestion = useCallback(() => {
    setSuggestion(null);
    setAnswerFeedback('Not in the answer bank — try another WPILib or FRC term.');
    setInput('');
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (phase !== 'read') return;
    setReadLeft(pack.readDelayMs);
    setAnswerFeedback(null);
    setSuggestion(null);
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const left = pack.readDelayMs - (Date.now() - t0);
      if (left <= 0) {
        window.clearInterval(id);
        setPhase('answer');
        setAnswerLeft(pack.answerMs);
      } else {
        setReadLeft(left);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, roundIndex, pack.readDelayMs]);

  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  useEffect(() => {
    if (phase !== 'answer') return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const left = pack.answerMs - (Date.now() - t0);
      if (left <= 0) {
        window.clearInterval(id);
        finishRoundRef.current(inputValueRef.current);
      } else {
        setAnswerLeft(left);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, roundIndex, pack.answerMs]);

  useEffect(() => {
    if (phase === 'answer') {
      inputRef.current?.focus();
    }
  }, [phase, roundIndex]);

  const advance = () => {
    setInput('');
    setLastTyped('');
    setAnswerFeedback(null);
    setSuggestion(null);
    if (roundIndex + 1 >= roundCount) {
      setPhase('summary');
      return;
    }
    setRoundIndex((i) => i + 1);
    setPhase('read');
  };

  const repoUrl = `https://github.com/${team.linkToCodebases}`;

  const codePanel = (
    <DiveCodePanel
      source={source}
      fileLabel={fileLabel}
      highlightLine={depthLine}
      backdropCaption={backdropCaption}
    />
  );

  if (phase === 'summary') {
    const finalLine = depthLineForScore(totalPoints, maxPoints, meta.lineCount);
    return (
      <div className="dive-app dive-play">
        <div className="dive-play-layout">
          <div className="dive-play-main lesson-content">
            <h2>Run complete</h2>
            <p>
              Trivia: {totalPoints} / {maxPoints} points ({depthMetersForPoints(totalPoints)} m).
            </p>
            <p>
              Backdrop scrolled to line {finalLine} of {meta.lineCount} in Team {team.teamNumber}&apos;s{' '}
              <code>{fileLabel}</code> (not part of the quiz).
            </p>
            <ul className="dive-summary-list">
              {results.map((r, i) => {
                const promptForRound = prompts.find((p) => p.id === r.promptId);
                return (
                  <li key={r.promptId + i} className="dive-summary-item">
                    <p className="dive-summary-item-head">
                      <em className="dive-summary-item-meta">
                        <DiveRoundLessonLink index={i} prompt={promptForRound} />: {r.points} pts
                        {r.tier ? ` (${TIER_LABELS[r.tier]})` : ' (no match)'}
                      </em>{' '}
                      {r.prompt}
                    </p>
                    {promptForRound ? (
                      <DiveAcceptedAnswers answers={promptForRound.answers} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <div className="dive-play-actions">
              <a className="dive-secondary-btn" href={repoUrl} target="_blank" rel="noopener noreferrer">
                Open backdrop repo on GitHub
              </a>
              <button type="button" className="dive-primary-btn" onClick={onExit}>
                Back to start
              </button>
            </div>
            <p className="dive-disclaimer">
              Snapshot from {team.linkToCodebases} ({meta.chosenFile}). Not affiliated with the team or
              FIRST. License: {formatDiveLicense(meta.license)}.
            </p>
          </div>
          <DiveCodePanel
            source={source}
            fileLabel={fileLabel}
            highlightLine={finalLine}
            backdropCaption={backdropCaption}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dive-app dive-play">
      <div className="dive-play-topbar">
        <button type="button" className="dive-link-btn" onClick={onExit}>
          ← Exit
        </button>
        <span>
          Round {roundIndex + 1}/{roundCount} · {totalPoints} pts · {totalDepthM} m
        </span>
      </div>
      <div className="dive-play-layout">
        <div className="dive-play-main">
          {phase === 'read' && (
            <div className="dive-prompt-card">
              <p className="dive-phase-label">Read the prompt ({formatMs(readLeft)})</p>
              <h2 className="dive-prompt-text">{current?.prompt}</h2>
            </div>
          )}
          {phase === 'answer' && (
            <div className="dive-prompt-card">
              <p className="dive-phase-label">Answer ({formatMs(answerLeft)}) — keep trying until you score or time runs out</p>
              <h2 className="dive-prompt-text">{current?.prompt}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  attemptAnswer(input);
                }}
              >
                <input
                  ref={inputRef}
                  className="dive-answer-input"
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (suggestion) setSuggestion(null);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Your answer"
                />
                <button type="submit" className="dive-primary-btn">Submit</button>
              </form>
              {answerFeedback ? <p className="dive-answer-feedback" role="status">{answerFeedback}</p> : null}
              {suggestion ? (
                <div className="dive-suggestion" role="status">
                  <p>
                    Did you mean <strong>{suggestion.displayText}</strong>?
                  </p>
                  <div className="dive-suggestion-actions">
                    <button type="button" className="dive-primary-btn" onClick={acceptSuggestion}>
                      Yes, use this answer
                    </button>
                    <button type="button" className="dive-secondary-btn" onClick={dismissSuggestion}>
                      No, keep trying
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {phase === 'reveal' && results[results.length - 1] && (
            <div className="dive-prompt-card dive-reveal">
              <p className="dive-phase-label">Result</p>
              {(() => {
                const r = results[results.length - 1];
                return (
                  <>
                    <p>
                      You typed: <strong>{r.userAnswer || '(empty)'}</strong>
                      {r.confirmedSuggestion ? (
                        <>
                          {' '}
                          — confirmed <strong>{r.confirmedSuggestion}</strong>
                        </>
                      ) : null}
                    </p>
                    {r.matchedText ? (
                      <p>
                        Matched <strong>{r.matchedText}</strong> — {TIER_LABELS[r.tier!]} ({r.points} pts, +
                        {r.depthMeters} m)
                      </p>
                    ) : (
                      <p>Time ran out with no match in the practice bank.</p>
                    )}
                    {current?.learnMore ? (
                      <p className="dive-reveal-lesson">
                        <DiveRoundLessonLink index={roundIndex} prompt={current} /> — open related Mantik
                        lesson
                      </p>
                    ) : null}
                    {current?.answers.length ? (
                      <DiveAcceptedAnswers answers={current.answers} />
                    ) : null}
                    <button type="button" className="dive-primary-btn" onClick={advance}>
                      {roundIndex + 1 >= roundCount ? 'See summary' : 'Next prompt'}
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        {codePanel}
      </div>
    </div>
  );
}
