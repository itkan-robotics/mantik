import type { TuningConfig } from '../types';

/** WPILib ElevatorFeedforward: V = kG + kS·sgn(v) + kV·v + kA·a */
export function calculateElevatorFeedforward(
  config: Pick<TuningConfig, 'kS' | 'kG' | 'kV'>,
  velocity: number,
  acceleration = 0,
  kA = 0,
): number {
  const sign = velocity === 0 ? 0 : Math.sign(velocity);
  return config.kG + config.kS * sign + config.kV * velocity + kA * acceleration;
}
