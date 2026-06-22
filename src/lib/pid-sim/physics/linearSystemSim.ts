import type { Vec2 } from './numericalIntegration';
import { rkdp } from './numericalIntegration';

/** Clamp input magnitude while preserving sign (WPILib desaturateInputVector, scalar). */
export function clampInputScalar(input: number, maxMagnitude: number): number {
  if (maxMagnitude <= 0) return 0;
  if (Math.abs(input) <= maxMagnitude) return input;
  return Math.sign(input) * maxMagnitude;
}

/**
 * Minimal 2-state / 1-input / 2-output linear system sim — port of WPILib LinearSystemSim.
 * Output y = x (C = I, D = 0).
 */
export class LinearSystemSim2 {
  private x: Vec2 = [0, 0];
  private u = 0;
  private y: Vec2 = [0, 0];

  constructor(
    private a22: number,
    private b2: number,
    private xdotExtra: (x: Vec2) => Vec2 = () => [0, 0],
    private measurementStdDevs: Vec2 = [0, 0],
  ) {}

  setState(position: number, velocity: number) {
    this.x = [position, velocity];
    this.y = [...this.x];
  }

  setInput(voltage: number) {
    this.u = voltage;
  }

  getInput(): number {
    return this.u;
  }

  clampInput(maxMagnitude: number) {
    this.u = clampInputScalar(this.u, maxMagnitude);
  }

  getOutput(): readonly [number, number] {
    return this.y;
  }

  getOutputRow(row: number): number {
    return this.y[row];
  }

  update(dt: number, integrate: (f: (x: Vec2, u: number) => Vec2, x: Vec2, u: number, dt: number) => Vec2) {
    this.x = integrate(
      (state, input) => {
        const extra = this.xdotExtra(state);
        return [state[1], this.a22 * state[1] + this.b2 * input + extra[1]];
      },
      this.x,
      this.u,
      dt,
    );

    this.y = [...this.x];

    if (this.measurementStdDevs[0] > 0 || this.measurementStdDevs[1] > 0) {
      this.y = [
        this.y[0] + gaussianNoise(this.measurementStdDevs[0]),
        this.y[1] + gaussianNoise(this.measurementStdDevs[1]),
      ];
    }
  }

  /** Default WPILib integrator. */
  updateWithRkdp(dt: number) {
    this.update(dt, rkdp);
  }
}

function gaussianNoise(stdDev: number): number {
  if (stdDev <= 0) return 0;
  const u1 = Math.random();
  const u2 = Math.random();
  return stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
