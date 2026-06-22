/**
 * Single-jointed arm plant — ported from controls_js_sim plant/vertical-arm-plant.js.
 * Internal state in radians; gravity torque ∝ cos(angle).
 */
import type { ArmPlantConfig } from '../../types';
import type { DCMotorModel } from '../dcMotor';
import { getVoltage } from '../dcMotor';
import { secondOrderRK4 } from '../utils/rk4';
import { angleDegToRad } from '../units/armUnits';

export const PLANT_DT = 0.005;

export interface ArmPlantPhysicsCoeffs {
  inertiaKgM2: number;
  kGVolts: number;
  kVVoltSecondPerRad: number;
  kAVoltSecondSquaredPerRad: number;
}

export function computeArmPlantPhysicsCoeffs(
  motor: DCMotorModel,
  plant: ArmPlantConfig,
): ArmPlantPhysicsCoeffs {
  const massKg = plant.massKg;
  const armLengthM = plant.armLengthM;
  const gearing = plant.gearRatio;
  const inertiaKgM2 = massKg * armLengthM * armLengthM;
  const { KtNMPerAmp: Kt, rOhms: R, KvRadPerSecPerVolt: Kv } = motor;

  const a22 = (-(gearing * gearing) * Kt) / (R * inertiaKgM2 * Kv);
  const b2 = (gearing * Kt) / (R * inertiaKgM2);

  const torqueNm = (massKg * 9.8 * armLengthM) / gearing;
  const kGVolts = getVoltage(motor, torqueNm, 0);
  const kAVoltSecondSquaredPerRad = 1 / b2;
  const kVVoltSecondPerRad = -a22 / b2;

  return { inertiaKgM2, kGVolts, kVVoltSecondPerRad, kAVoltSecondSquaredPerRad };
}

export class ArmPlant {
  private state: [number, number] = [0, 0];
  private readonly coeffs: ArmPlantPhysicsCoeffs;
  private hardMinRad: number;
  private hardMaxRad: number;

  constructor(
    motor: DCMotorModel,
    plant: ArmPlantConfig,
    private readonly timestepS = PLANT_DT,
  ) {
    this.coeffs = computeArmPlantPhysicsCoeffs(motor, plant);
    this.hardMinRad = angleDegToRad(plant.hardMinDeg);
    this.hardMaxRad = angleDegToRad(plant.hardMaxDeg);
    this.state = [angleDegToRad(plant.startAngleDeg), 0];
  }

  reset(startAngleRad: number): void {
    this.state = [startAngleRad, 0];
  }

  getPositionRad(): number {
    return this.state[0];
  }

  getVelocityRadPerSec(): number {
    return this.state[1];
  }

  /** Hold voltage at horizontal (θ = 0) — ArmFeedforward kG constant hint. */
  getHoldVoltageHorizontal(): number {
    return this.coeffs.kGVolts;
  }

  /** Steady-state hold voltage at a mechanism angle. */
  getHoldVoltageAt(angleRad: number): number {
    return this.coeffs.kGVolts * Math.cos(angleRad);
  }

  private acceleration([posRad, velRadPerS]: [number, number], inputVolts: number): [number, number] {
    const { kGVolts, kVVoltSecondPerRad, kAVoltSecondSquaredPerRad } = this.coeffs;

    const gravityAcceleration =
      (-kGVolts * Math.cos(posRad)) / kAVoltSecondSquaredPerRad;
    const emfAcceleration =
      (-kVVoltSecondPerRad * velRadPerS) / kAVoltSecondSquaredPerRad;
    const controlAcceleration = inputVolts / kAVoltSecondSquaredPerRad;

    let springAccel = 0;
    let dashpotAccel = 0;

    if (posRad > this.hardMaxRad) {
      springAccel = (posRad - this.hardMaxRad) * -100_000;
      dashpotAccel = -100 * velRadPerS;
    } else if (posRad < this.hardMinRad) {
      springAccel = (posRad - this.hardMinRad) * -100_000;
      dashpotAccel = -100 * velRadPerS;
    }

    const accelRadPerSec2 =
      gravityAcceleration + emfAcceleration + controlAcceleration + springAccel + dashpotAccel;

    return [velRadPerS, accelRadPerSec2];
  }

  update(inputVolts: number): void {
    this.state = secondOrderRK4(
      (state, volts) => this.acceleration(state, volts),
      this.state,
      inputVolts,
      this.timestepS,
    );
  }
}
