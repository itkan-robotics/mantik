export type Vendor = 'rev' | 'ctre';

/**
 * Tuning constants parsed from Java templates and SpringTune sliders.
 * Setpoint and motion limits use **motor rotations** (SparkMax / Talon FX encoder units).
 * kP is V/rot; kV is V/(rot/s); kA is V/(rot/s²); kG/kS in volts.
 */
export interface TuningConfig {
  kP: number;
  kI: number;
  kD: number;
  kS: number;
  kG: number;
  kV: number;
  kA: number;
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
  /** Carriage height in meters (display / TraceView). */
  position: number;
  /** Carriage velocity in m/s. */
  velocity: number;
  /** Profile setpoint in meters. */
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

/** Default setpoint ≈ start height in motor rotations (see elevatorReference). */
export const DEFAULT_TUNING: TuningConfig = {
  kP: 0,
  kI: 0,
  kD: 0,
  kS: 0,
  kG: 0,
  kV: 0,
  kA: 0,
  maxVelocity: 0,
  maxAccel: 0,
  setpoint: 0,
};

/** @deprecated use REFERENCE_PLANT from elevatorReference.ts */
export const ELEVATOR_LIMITS = {
  minHeight: 0,
  maxHeight: 3,
  startHeight: 0.5,
  massLbs: 16,
};
