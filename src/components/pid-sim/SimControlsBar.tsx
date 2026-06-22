import { memo } from 'react';

interface Props {
  teleopEnabled: boolean;
  onTeleopChange: (enabled: boolean) => void;
  liveTuning: boolean;
  onLiveTuningChange: (enabled: boolean) => void;
  simRunning: boolean;
  codeValid: boolean;
  onRun: () => void;
  onStop: () => void;
  parseError: string | null;
}

function SimControlsBar({
  teleopEnabled,
  onTeleopChange,
  liveTuning,
  onLiveTuningChange,
  simRunning,
  codeValid,
  onRun,
  onStop,
  parseError,
}: Props) {
  const runDisabled = !teleopEnabled || !codeValid;
  let runHint = '';
  if (!codeValid) runHint = 'Fix code errors before running';
  else if (!teleopEnabled) runHint = 'Enable Teleoperated to run';

  return (
    <div className="pid-sim-controls-bar">
      <div className="pid-sim-controls-toggles">
        <label className="pid-toggle-row" title="Matches Sim GUI teleop mode — required to run">
          <span>Teleoperated</span>
          <input
            type="checkbox"
            checked={teleopEnabled}
            onChange={(e) => onTeleopChange(e.target.checked)}
          />
        </label>
        <button
          type="button"
          className={`pid-live-tuning-btn ${liveTuning ? 'active' : ''}`}
          title="Required only for SpringTune slider edits. Code edits always apply."
          onClick={() => onLiveTuningChange(!liveTuning)}
        >
          Live Tuning
        </button>
      </div>

      <div className="pid-sim-controls-prereq">
        <span className={teleopEnabled ? 'met' : ''}>Teleop</span>
        <span className={codeValid ? 'met' : ''}>Valid code</span>
        <span className={simRunning ? 'met' : ''}>Sim running</span>
      </div>

      <div className="pid-sim-controls-run">
        {!simRunning ? (
          <button
            type="button"
            className="pid-run-btn"
            disabled={runDisabled}
            title={runHint}
            onClick={onRun}
          >
            Run Simulation
          </button>
        ) : (
          <button type="button" className="pid-stop-btn" onClick={onStop}>
            Stop
          </button>
        )}
        {parseError && <span className="pid-error-msg">{parseError}</span>}
        {!simRunning && runHint && !parseError && (
          <span className="pid-hint-msg">{runHint}</span>
        )}
      </div>
    </div>
  );
}

export default memo(SimControlsBar);
