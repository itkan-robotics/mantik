import type { PlantConfig } from '../types';
import type { DCMotorModel } from './dcMotor';
import { getCurrent, getVoltage } from './dcMotor';
import { LinearSystemSim2 } from './linearSystemSim';
import type { Vec2 } from './numericalIntegration';

/** WPILib ElevatorSim uses 9.8 m/s². */
export const WPILIB_GRAVITY = 9.8;

/** WPILib LinearSystemId.createElevatorSystem matrices for [position, velocity]. */
export function createElevatorPlantMatrices(
  motor: DCMotorModel,
  plant: PlantConfig,
): { a11: number; a12: number; a21: number; a22: number; b2: number } {
  const massKg = plant.massLbs * 0.453592;
  const drumRadiusM = plant.drumCircumferenceM / (2 * Math.PI);
  const gearing = plant.gearRatio;
  const { KtNMPerAmp: Kt, rOhms: R, KvRadPerSecPerVolt: Kv } = motor;

  const a22 = (-(gearing * gearing) * Kt) / (R * drumRadiusM * drumRadiusM * massKg * Kv);
  const b2 = (gearing * Kt) / (R * drumRadiusM * massKg);

  return { a11: 0, a12: 1, a21: 0, a22, b2 };
}

/** Analytic hold voltage at rest against gravity for this plant + motor. */
export function computeHoldVoltage(motor: DCMotorModel, plant: PlantConfig): number {
  const massKg = plant.massLbs * 0.453592;
  const drumRadiusM = plant.drumCircumferenceM / (2 * Math.PI);
  const torqueNm = (massKg * WPILIB_GRAVITY * drumRadiusM) / plant.gearRatio;
  return getVoltage(motor, torqueNm, 0);
}

/** Theoretical kV: V = kG + kV·v at steady velocity (SysId / plant model). */
export function computeTheoreticalKV(motor: DCMotorModel, plant: PlantConfig): number {
  const { a22, b2 } = createElevatorPlantMatrices(motor, plant);
  return -a22 / b2;
}

/** Theoretical kA at v=0 with kG compensating gravity. */
export function computeTheoreticalKA(motor: DCMotorModel, plant: PlantConfig): number {
  const { b2 } = createElevatorPlantMatrices(motor, plant);
  return 1 / b2;
}

/** WPILib PID uses kP in V/m — no vendor-specific output scaling. */
export const WPILIB_PID_OUTPUT_SCALE = 1;

/** Default ζ when deriving lesson optimal kP from plant matrices. */
export const DEFAULT_OPTIMAL_ZETA = 0.75;

/**
 * kP where ζ = zetaTarget for P-only control on the linearized plant: ζ = |a22| / (2√(b2·kP)).
 */
export function computeOptimalKpFromPlant(
  motor: DCMotorModel,
  plant: PlantConfig,
  zetaTarget = DEFAULT_OPTIMAL_ZETA,
): number {
  const { a22, b2 } = createElevatorPlantMatrices(motor, plant);
  const damping = -a22;
  return (damping * damping) / (4 * b2 * zetaTarget * zetaTarget);
}

/** Closed-loop ζ at kP with WPILib-native units (pidOutputScale = 1). */
export function computeZetaAtKp(
  motor: DCMotorModel,
  plant: PlantConfig,
  kP: number,
): number {
  if (kP <= 0) return Infinity;
  const { a22, b2 } = createElevatorPlantMatrices(motor, plant);
  return (-a22) / (2 * Math.sqrt(b2 * kP));
}

/**
 * WPILib-faithful elevator plant — port of edu.wpi.first.wpilibj.simulation.ElevatorSim.
 */
export class ElevatorSimPlant {
  private sim: LinearSystemSim2;
  private a22: number;
  private b2: number;

  constructor(
    private motor: DCMotorModel,
    private plant: PlantConfig,
    private simulateGravity = true,
    measurementStdDevs: number[] = [],
  ) {
    const m = createElevatorPlantMatrices(motor, plant);
    this.a22 = m.a22;
    this.b2 = m.b2;

    const noise: Vec2 = [
      measurementStdDevs[0] ?? 0,
      measurementStdDevs[1] ?? 0,
    ];

    this.sim = new LinearSystemSim2(
      this.a22,
      this.b2,
      () => (this.simulateGravity ? [0, -WPILIB_GRAVITY] : [0, 0]),
      noise,
    );

    this.setState(plant.startHeightM, 0);
  }

  setPlant(plant: PlantConfig) {
    this.plant = plant;
    const m = createElevatorPlantMatrices(this.motor, plant);
    this.a22 = m.a22;
    this.b2 = m.b2;
    this.sim = new LinearSystemSim2(
      this.a22,
      this.b2,
      () => (this.simulateGravity ? [0, -WPILIB_GRAVITY] : [0, 0]),
    );
  }

  setState(positionMeters: number, velocityMetersPerSecond: number) {
    const pos = Math.max(this.plant.minHeightM, Math.min(this.plant.maxHeightM, positionMeters));
    this.sim.setState(pos, velocityMetersPerSecond);
  }

  setInputVoltage(volts: number, maxVoltage = 12) {
    this.sim.setInput(volts);
    this.sim.clampInput(maxVoltage);
  }

  update(dtSeconds: number) {
    this.sim.updateWithRkdp(dtSeconds);
    this.applyLimits();
  }

  /** Post-integration limit handling from WPILib ElevatorSim.updateX. */
  private applyLimits() {
    const pos = this.getPositionMeters();
    if (this.wouldHitLowerLimit(pos)) {
      this.sim.setState(this.plant.minHeightM, 0);
    } else if (this.wouldHitUpperLimit(pos)) {
      this.sim.setState(this.plant.maxHeightM, 0);
    }
  }

  wouldHitLowerLimit(heightMeters: number): boolean {
    return heightMeters <= this.plant.minHeightM;
  }

  wouldHitUpperLimit(heightMeters: number): boolean {
    return heightMeters >= this.plant.maxHeightM;
  }

  getPositionMeters(): number {
    return this.sim.getOutputRow(0);
  }

  getVelocityMetersPerSecond(): number {
    return this.sim.getOutputRow(1);
  }

  /** Port of ElevatorSim.getCurrentDrawAmps(). */
  getCurrentDrawAmps(): number {
    const kA = 1 / this.b2;
    const kV = -this.a22 * kA;
    const linearVelocity = this.getVelocityMetersPerSecond();
    const motorVelocityRadPerSec = linearVelocity * kV * this.motor.KvRadPerSecPerVolt;
    const appliedVoltage = this.sim.getInput();
    return getCurrent(this.motor, motorVelocityRadPerSec, appliedVoltage) * Math.sign(appliedVoltage || 1);
  }
}

/** @deprecated use ElevatorSimPlant */
export type ElevatorPlantState = { position: number; velocity: number };

/** @deprecated use ElevatorSimPlant */
export class ElevatorPlant extends ElevatorSimPlant {}
