import { aidLevel, aidTier } from '@/lib/pid-sim/guides/aidLevel';
import type { TuningGuideStep } from '@/lib/pid-sim/guides/tuningGuideSteps';
import { unmetPrerequisites, type PrerequisiteState } from '@/lib/pid-sim/guides/prerequisites';
import type { MechanismType } from '@/lib/pid-sim/types';

interface Props {
  stepIndex: number;
  onStepChange: (index: number) => void;
  simRunning: boolean;
  highlightPulse?: boolean;
  prerequisiteState: PrerequisiteState;
  steps: TuningGuideStep[];
  mechanism?: MechanismType;
}

export default function TuningGuidePanel({
  stepIndex,
  onStepChange,
  simRunning,
  highlightPulse = false,
  prerequisiteState,
  steps,
  mechanism = 'elevator',
}: Props) {
  const step = steps[stepIndex] ?? steps[0]!;
  const level = aidLevel(stepIndex, steps.length);
  const tier = aidTier(level);
  const isLast = stepIndex >= steps.length - 1;
  const unmet = unmetPrerequisites(step.advancePrerequisites, prerequisiteState);
  const canAdvance = unmet.length === 0;

  return (
    <div className="pid-guide-panel">
      <div className="pid-panel-header">
        <span>Tuning Guide</span>
        <span className="pid-panel-sub">
          {stepIndex + 1} / {steps.length}
        </span>
      </div>
      <div className={`pid-guide-content ${tier === 'full' && highlightPulse ? 'aid-pulse' : ''}`}>
        {tier === 'full' && step.highlight && (
          <p className="pid-look-here">Focus here</p>
        )}
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        {step.learnMore && step.learnMore.length > 0 && (
          <ul className="pid-learn-more">
            {step.learnMore.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        )}
        {step.referenceHint && tier !== 'minimal' && (
          <p className="pid-reference-hint">
            <strong>Reference:</strong> {step.referenceHint}
          </p>
        )}
        {step.prompt && tier !== 'minimal' && (
          <p className="pid-guide-prompt visible">
            <strong>Ask yourself:</strong> {step.prompt}
          </p>
        )}
        {step.checklist && tier !== 'minimal' && (
          <ul className="pid-checklist">
            {step.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {step.needsSim && !simRunning && (
          <p className="pid-guide-nudge">Start the simulation to observe your changes.</p>
        )}
        {unmet.length > 0 && (
          <ul className="pid-prereq-block">
            {unmet.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {step.id === 'complete' && (
          <div className="pid-wizard-links">
            <a href="/frc/pid-tuning-practice-setup">Full setup guide</a>
            <a
              href={
                mechanism === 'arm'
                  ? '/frc/pid-tuning-practice-arm'
                  : mechanism === 'flywheel'
                    ? '/frc/pid-tuning-practice-shooter'
                    : '/frc/pid-tuning-practice-elevator'
              }
            >
              {mechanism === 'arm'
                ? 'Arm tuning lesson'
                : mechanism === 'flywheel'
                  ? 'Flywheel tuning lesson'
                  : 'Elevator tuning lesson'}
            </a>
            <a
              href="https://github.com/itkan-robotics/mantik-pid-practice"
              target="_blank"
              rel="noopener noreferrer"
            >
              Local sim repo
            </a>
          </div>
        )}
      </div>
      <div className="pid-guide-nav">
        <button type="button" disabled={stepIndex === 0} onClick={() => onStepChange(stepIndex - 1)}>
          Back
        </button>
        <button type="button" disabled={isLast || !canAdvance} onClick={() => onStepChange(stepIndex + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
