import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SimSample } from '../types';
import { ElevatorSim, SIM_DT } from './elevatorSim';
import { REFERENCE_PLANT } from '../reference/elevatorReference';
import type { GoldenScenario } from './goldenScenarios';

export interface GoldenRow {
  time: number;
  position: number;
  velocity: number;
  setpoint: number;
  output: number;
}

export interface TraceMetrics {
  finalPosition: number;
  peakOvershoot: number;
  settlingTimeSec: number | null;
  holdDriftM: number;
}

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), 'golden');

export function loadGoldenCsv(scenarioId: string): GoldenRow[] {
  const path = join(GOLDEN_DIR, `${scenarioId}.csv`);
  if (!existsSync(path)) {
    throw new Error(`Golden trace missing: ${path}. Run npm run golden:export (requires Java/WPILib).`);
  }
  const text = readFileSync(path, 'utf8').trim();
  const lines = text.split('\n');
  const rows: GoldenRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [time, position, velocity, setpoint, output] = lines[i].split(',');
    rows.push({
      time: Number(time),
      position: Number(position),
      velocity: Number(velocity),
      setpoint: Number(setpoint),
      output: Number(output),
    });
  }
  return rows;
}

export function runBrowserScenario(scenario: GoldenScenario): SimSample[] {
  const sim = new ElevatorSim(REFERENCE_PLANT);
  sim.setConfig(scenario.config);
  sim.setEnabled(true);
  const steps = Math.round(scenario.durationSec / SIM_DT);
  for (let i = 0; i < steps; i++) sim.step();
  return [...sim.getSamples()];
}

export function computeTraceMetrics(
  samples: readonly { time: number; position: number; velocity: number; setpoint: number }[],
  targetSetpoint: number,
): TraceMetrics {
  if (samples.length === 0) {
    return { finalPosition: 0, peakOvershoot: 0, settlingTimeSec: null, holdDriftM: 0 };
  }

  const final = samples[samples.length - 1];
  const startPos = samples[0].position;
  const peak = samples.reduce((m, s) => Math.max(m, s.position), targetSetpoint);
  const peakOvershoot = Math.max(0, peak - targetSetpoint);

  const band = 0.02 * Math.max(Math.abs(targetSetpoint - startPos), 0.1);
  let settlingTimeSec: number | null = null;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i].position - targetSetpoint) > band) {
      settlingTimeSec = i + 1 < samples.length ? samples[i + 1].time : null;
      break;
    }
  }
  if (settlingTimeSec === null && Math.abs(final.position - targetSetpoint) <= band) {
    settlingTimeSec = 0;
  }

  const holdStart = samples[Math.floor(samples.length * 0.7)]?.position ?? startPos;
  const holdDriftM = Math.abs(final.position - holdStart);

  return {
    finalPosition: final.position,
    peakOvershoot,
    settlingTimeSec,
    holdDriftM,
  };
}

/** Relative error for scalar comparison; returns 0 if both near zero. */
export function relativeError(actual: number, expected: number, floor = 1e-6): number {
  const denom = Math.max(Math.abs(expected), floor);
  return Math.abs(actual - expected) / denom;
}

export function assertWithinTolerance(
  actual: number,
  expected: number,
  toleranceFraction: number,
  label: string,
): void {
  const err = relativeError(actual, expected);
  if (err > toleranceFraction) {
    throw new Error(
      `${label}: expected ${expected}, got ${actual} (${(err * 100).toFixed(1)}% error, max ${(toleranceFraction * 100).toFixed(0)}%)`,
    );
  }
}

/** Compare browser sim samples to golden CSV at aligned timesteps. */
export function compareSamplesToGolden(
  browser: readonly SimSample[],
  golden: readonly GoldenRow[],
  toleranceFraction = 0.1,
): void {
  const n = Math.min(browser.length, golden.length);
  if (n < 10) {
    throw new Error(`Too few samples to compare (${n})`);
  }

  let maxPosErr = 0;
  let maxVelErr = 0;
  for (let i = 0; i < n; i++) {
    maxPosErr = Math.max(maxPosErr, relativeError(browser[i].position, golden[i].position, 0.05));
    maxVelErr = Math.max(maxVelErr, relativeError(browser[i].velocity, golden[i].velocity, 0.2));
  }

  if (maxPosErr > toleranceFraction) {
    throw new Error(`Position trace max error ${(maxPosErr * 100).toFixed(1)}% exceeds ${(toleranceFraction * 100).toFixed(0)}%`);
  }
  if (maxVelErr > toleranceFraction * 1.5) {
    throw new Error(`Velocity trace max error ${(maxVelErr * 100).toFixed(1)}% exceeds ${(toleranceFraction * 150).toFixed(0)}%`);
  }
}
