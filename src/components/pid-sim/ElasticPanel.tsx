import { memo } from 'react';
import type { MechanismType, TuningConfig } from '@/lib/pid-sim/types';
import { KP_SLIDER_MAX } from '@/lib/pid-sim/reference/elevatorReference';
import { ARM_KP_SLIDER_MAX, ARM_SETPOINT_SLIDER_MAX } from '@/lib/pid-sim/reference/armReference';

interface Props {
  config: TuningConfig;
  onChange: (key: keyof TuningConfig, value: number) => void;
  onChangeCommit?: (key: keyof TuningConfig, value: number) => void;
  liveTuning: boolean;
  highlightedField?: keyof TuningConfig;
  onSliderFocus?: () => void;
  mechanism?: MechanismType;
}

function fieldsFor(mechanism: MechanismType) {
  const kpMax = mechanism === 'arm' ? ARM_KP_SLIDER_MAX : KP_SLIDER_MAX;
  const setpointMax = mechanism === 'arm' ? ARM_SETPOINT_SLIDER_MAX : 260;
  return [
    { key: 'kG' as const, label: 'kG (gravity FF, V)', min: 0, max: 5, step: 0.01 },
    { key: 'kP' as const, label: 'kP (V/rot)', min: 0, max: kpMax, step: 0.05 },
    { key: 'kI' as const, label: 'kI (V·s/rot)', min: 0, max: 5, step: 0.01 },
    { key: 'kD' as const, label: 'kD (V/(rot/s))', min: 0, max: 5, step: 0.01 },
    { key: 'kS' as const, label: 'kS (static FF, V)', min: 0, max: 2, step: 0.01 },
    { key: 'kV' as const, label: 'kV (V/(rot/s))', min: 0, max: 10, step: 0.01 },
    { key: 'setpoint' as const, label: 'Setpoint (motor rot)', min: -setpointMax, max: setpointMax, step: 0.5 },
    { key: 'maxVelocity' as const, label: 'Max velocity (rot/s)', min: 0, max: 50, step: 0.5 },
    { key: 'maxAccel' as const, label: 'Max accel (rot/s²)', min: 0, max: 200, step: 1 },
  ];
}

function ElasticPanel({
  config,
  onChange,
  onChangeCommit,
  liveTuning,
  highlightedField,
  onSliderFocus,
  mechanism = 'elevator',
}: Props) {
  const commit = onChangeCommit ?? onChange;
  const FIELDS = fieldsFor(mechanism);

  return (
    <div className="pid-elastic-panel">
      <div className="pid-panel-header">
        <span>SpringTune</span>
        <span className="pid-panel-sub">
          {liveTuning ? 'Live tuning active' : 'Enable Live Tuning in Sim Controls to use sliders'}
        </span>
      </div>

      <div className="pid-widget-grid">
        {FIELDS.map(({ key, label, min, max, step }) => (
          <div
            key={key}
            className={`pid-widget ${highlightedField === key ? 'highlighted' : ''}`}
          >
            <label htmlFor={`field-${key}`}>{label}</label>
            <div className="pid-widget-inputs">
              <input
                id={`field-${key}`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                disabled={!liveTuning}
                onFocus={onSliderFocus}
                onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
                onBlur={(e) => commit(key, parseFloat(e.target.value) || 0)}
              />
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                disabled={!liveTuning}
                onFocus={onSliderFocus}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                onPointerUp={(e) =>
                  commit(key, parseFloat((e.target as HTMLInputElement).value))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ElasticPanel);
