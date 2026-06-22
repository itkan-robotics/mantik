export type Vendor = 'rev' | 'ctre';

export interface TuningConfig {
  kP: number;
  kI: number;
  kD: number;
  kS: number;
  kG: number;
  kV: number;
  maxVelocity: number;
  maxAccel: number;
  setpoint: number;
}

/** Physical elevator parameters — scaffold for future editable plant dynamics. */
export interface PlantConfig {
  massLbs: number;
  minHeightM: number;
  maxHeightM: number;
  startHeightM: number;
  gearRatio: number;
  drumCircumferenceM: number;
}

export interface SimSample {
  time: number;
  position: number;
  velocity: number;
  setpoint: number;
  output: number;
}

export interface ParseResult {
  config: TuningConfig | null;
  errors: LintMessage[];
}

export interface LintMessage {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning';
}

export const DEFAULT_TUNING: TuningConfig = {
  kP: 0,
  kI: 0,
  kD: 0,
  kS: 0,
  kG: 0,
  kV: 0,
  maxVelocity: 0,
  maxAccel: 0,
  setpoint: 0.5,
};

/** @deprecated use REFERENCE_PLANT from elevatorReference.ts */
export const ELEVATOR_LIMITS = {
  minHeight: 0,
  maxHeight: 3,
  startHeight: 0.5,
  massLbs: 16,
};
