/**
 * WPILib reference loop for golden trace export.
 * Mirrors mantik-pid-practice GoldenTraceExportTest.java (headless ElevatorSim + P-only + kG FF).
 * Uses ElevatorSimPlant — same RKDP plant as browser ElevatorSim.
 */
import type { PlantConfig, TuningConfig } from '../types';
import { REFERENCE_PLANT, tunerKpToPhysics } from '../reference/elevatorReference';
import { GOLDEN_SCENARIOS } from './goldenScenarios';
import { getNeo } from './dcMotor';
import { computeHoldVoltage, ElevatorSimPlant } from './elevatorPlant';

export const REFERENCE_DT = 0.02;
const MAX_VOLTAGE = 12;

export interface ReferenceSample {
  time: number;
  position: number;
  velocity: number;
  setpoint: number;
  output: number;
}

export function runWpilibReferenceScenario(
  plantConfig: PlantConfig,
  config: Pick<TuningConfig, 'kG' | 'kP' | 'setpoint'>,
  durationSec: number,
): ReferenceSample[] {
  const motor = getNeo(1);
  const plant = new ElevatorSimPlant(motor, plantConfig, true);
  const kG = config.kG > 0 ? config.kG : computeHoldVoltage(motor, plantConfig);
  const samples: ReferenceSample[] = [];
  const steps = Math.round(durationSec / REFERENCE_DT);

  for (let i = 0; i <= steps; i++) {
    const time = i * REFERENCE_DT;
    const profilePos = config.setpoint;
    const position = plant.getPositionMeters();
    const error = profilePos - position;
    const pidOut = tunerKpToPhysics(config.kP) * error;
    const voltage = Math.max(-MAX_VOLTAGE, Math.min(MAX_VOLTAGE, pidOut + kG));

    plant.setInputVoltage(voltage, MAX_VOLTAGE);
    plant.update(REFERENCE_DT);

    samples.push({
      time,
      position: plant.getPositionMeters(),
      velocity: plant.getVelocityMetersPerSecond(),
      setpoint: profilePos,
      output: voltage,
    });
  }

  return samples;
}

export function samplesToCsv(samples: readonly ReferenceSample[]): string {
  const lines = ['time,position,velocity,setpoint,output'];
  for (const s of samples) {
    lines.push(
      `${s.time.toFixed(4)},${s.position.toFixed(6)},${s.velocity.toFixed(6)},${s.setpoint.toFixed(6)},${s.output.toFixed(6)}`,
    );
  }
  return lines.join('\n') + '\n';
}

/** Generate all golden scenarios for REFERENCE_PLANT. */
export function generateAllGoldenTraces(): Map<string, string> {
  const out = new Map<string, string>();
  for (const scenario of GOLDEN_SCENARIOS) {
    const samples = runWpilibReferenceScenario(REFERENCE_PLANT, scenario.config, scenario.durationSec);
    out.set(scenario.id, samplesToCsv(samples));
  }
  return out;
}
