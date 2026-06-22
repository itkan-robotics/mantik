import { memo } from 'react';
import MechanismPanel from './MechanismPanel';
import ArmMechanismPanel from './ArmMechanismPanel';
import GraphPanel from './GraphPanel';
import type { PidMechanismSim } from '@/lib/pid-sim/physics/simTypes';
import type { MechanismType } from '@/lib/pid-sim/types';

interface Props {
  simRef: React.RefObject<PidMechanismSim | null>;
  setpoint: number;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  mechanism: MechanismType;
  highlightMechanism?: boolean;
  highlightGraph?: boolean;
}

function SimulatorPanel({
  simRef,
  setpoint,
  paused,
  onPausedChange,
  mechanism,
  highlightMechanism = false,
  highlightGraph = false,
}: Props) {
  const yAxisLabel = mechanism === 'arm' ? 'deg / deg/s' : 'm / m/s';

  return (
    <div className="pid-simulator-panel">
      <div className="pid-panel-header">
        <span>BenchScope</span>
        <span className="pid-panel-sub">Mechanism view + TraceView</span>
      </div>
      <div className="pid-simulator-split">
        {mechanism === 'arm' ? (
          <ArmMechanismPanel
            simRef={simRef}
            setpoint={setpoint}
            highlight={highlightMechanism}
          />
        ) : (
          <MechanismPanel
            simRef={simRef}
            setpoint={setpoint}
            highlight={highlightMechanism}
          />
        )}
        <GraphPanel
          simRef={simRef}
          paused={paused}
          onPausedChange={onPausedChange}
          highlight={highlightGraph}
          yAxisLabel={yAxisLabel}
        />
      </div>
    </div>
  );
}

export default memo(SimulatorPanel);
