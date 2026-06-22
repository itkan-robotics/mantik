import { aidLevel, aidTier } from '@/lib/pid-sim/guides/aidLevel';
import { CODE_TOUR_STEPS, type CodeTourStep } from '@/lib/pid-sim/guides/codeTourSteps';
import { unmetPrerequisites, type PrerequisiteState } from '@/lib/pid-sim/guides/prerequisites';

interface Props {
  stepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void;
  highlightPulse?: boolean;
  prerequisiteState: PrerequisiteState;
}

export default function CodeTourPanel({
  stepIndex,
  onStepChange,
  onComplete,
  highlightPulse = false,
  prerequisiteState,
}: Props) {
  const step = CODE_TOUR_STEPS[stepIndex];
  const level = aidLevel(stepIndex, CODE_TOUR_STEPS.length);
  const tier = aidTier(level);
  const isLast = stepIndex >= CODE_TOUR_STEPS.length - 1;
  const unmet = unmetPrerequisites(step.advancePrerequisites, prerequisiteState);
  const canAdvance = unmet.length === 0;

  return (
    <div className="pid-guide-panel">
      <div className="pid-panel-header">
        <span>Code Tour</span>
        <span className="pid-panel-sub">
          {stepIndex + 1} / {CODE_TOUR_STEPS.length}
        </span>
      </div>
      <div className={`pid-guide-content ${tier === 'full' && highlightPulse ? 'aid-pulse' : ''}`}>
        {tier === 'full' && step.highlight && (
          <p className="pid-look-here">Look here</p>
        )}
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        {step.bodyExtra && <p>{step.bodyExtra}</p>}
        {step.learnMore && step.learnMore.length > 0 && (
          <ul className="pid-learn-more">
            {step.learnMore.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        )}
        {step.prompt && tier !== 'minimal' && (
          <p className="pid-guide-prompt visible">
            <strong>Try:</strong> {step.prompt}
          </p>
        )}
        {unmet.length > 0 && (
          <ul className="pid-prereq-block">
            {unmet.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="pid-guide-nav">
        <button type="button" disabled={stepIndex === 0} onClick={() => onStepChange(stepIndex - 1)}>
          Back
        </button>
        {!isLast ? (
          <button type="button" disabled={!canAdvance} onClick={() => onStepChange(stepIndex + 1)}>
            Next
          </button>
        ) : (
          <button
            type="button"
            className="pid-guide-finish"
            disabled={!canAdvance}
            onClick={onComplete}
          >
            Start Tuning Guide
          </button>
        )}
      </div>
    </div>
  );
}

export function getCodeTourStep(stepIndex: number): CodeTourStep {
  return CODE_TOUR_STEPS[stepIndex] ?? CODE_TOUR_STEPS[0];
}

export { CODE_TOUR_STEPS };
