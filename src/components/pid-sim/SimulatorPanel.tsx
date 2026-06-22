import { memo } from 'react';
import MechanismPanel from './MechanismPanel';
import GraphPanel from './GraphPanel';
import type { ElevatorSim } from '@/lib/pid-sim/physics/elevatorSim';

interface Props {
  simRef: React.RefObject<ElevatorSim | null>;
  setpoint: number;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  highlightMechanism?: boolean;
  highlightGraph?: boolean;
}

function SimulatorPanel({
  simRef,
  setpoint,
  paused,
  onPausedChange,
  highlightMechanism = false,
  highlightGraph = false,
}: Props) {
  return (
    <div className="pid-simulator-panel">
      <div className="pid-panel-header">
        <span>BenchScope</span>
        <span className="pid-panel-sub">Mechanism view + TraceView</span>
      </div>
      <div className="pid-simulator-split">
        <MechanismPanel
          simRef={simRef}
          setpoint={setpoint}
          highlight={highlightMechanism}
        />
        <GraphPanel
          simRef={simRef}
          paused={paused}
          onPausedChange={onPausedChange}
          highlight={highlightGraph}
        />
      </div>
    </div>
  );
}

export default memo(SimulatorPanel);
