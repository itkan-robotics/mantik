/**
 * Vertical elevator plant — ported from controls_js_sim plant/vertical-elevator-plant.js.
 * Internal state in meters; coefficients derived from DCMotor + PlantConfig.
 */
import type { PlantConfig } from '../../types';
import type { DCMotorModel } from '../dcMotor';
import { getVoltage } from '../dcMotor';
import { secondOrderRK4 } from '../utils/rk4';

export const PLANT_DT = 0.005;

export interface PlantPhysicsCoeffs {
  massKg: number;
  kGVolts: number;
  kVVoltSecondPerM: number;
  kAVoltSecondSquaredPerM: number;
}

export function computePlantPhysicsCoeffs(
  motor: DCMotorModel,
  plant: PlantConfig,
): PlantPhysicsCoeffs {
  const massKg = plant.massLbs * 0.453592;
  const drumRadiusM = plant.drumCircumferenceM / (2 * Math.PI);
  const gearing = plant.gearRatio;
  const { KtNMPerAmp: Kt, rOhms: R, KvRadPerSecPerVolt: Kv } = motor;

  const a22 =
    (-(gearing * gearing) * Kt) / (R * drumRadiusM * drumRadiusM * massKg * Kv);
  const b2 = (gearing * Kt) / (R * drumRadiusM * massKg);

  const torqueNm = (massKg * 9.8 * drumRadiusM) / gearing;
  const kGVolts = getVoltage(motor, torqueNm, 0);
  const kAVoltSecondSquaredPerM = 1 / b2;
  const kVVoltSecondPerM = -a22 / b2;

  return { massKg, kGVolts, kVVoltSecondPerM, kAVoltSecondSquaredPerM };
}

export class VerticalElevatorPlant {
  private state: [number, number] = [0, 0];
  private readonly coeffs: PlantPhysicsCoeffs;
  private minHeightM: number;
  private maxHeightM: number;

  constructor(
    motor: DCMotorModel,
    plant: PlantConfig,
    private readonly timestepS = PLANT_DT,
  ) {
    this.coeffs = computePlantPhysicsCoeffs(motor, plant);
    this.minHeightM = plant.minHeightM;
    this.maxHeightM = plant.maxHeightM;
    this.state = [plant.startHeightM, 0];
  }

  reset(startHeightM: number): void {
    this.state = [startHeightM, 0];
  }

  setLimits(minHeightM: number, maxHeightM: number): void {
    this.minHeightM = minHeightM;
    this.maxHeightM = maxHeightM;
  }

  getPositionM(): number {
    return this.state[0];
  }

  getVelocityMps(): number {
    return this.state[1];
  }

  /** Hold voltage against gravity at rest for this plant+motor. */
  getHoldVoltage(): number {
    return this.coeffs.kGVolts;
  }

  private acceleration([posM, velMps]: [number, number], inputVolts: number): [number, number] {
    const { kGVolts, kVVoltSecondPerM, kAVoltSecondSquaredPerM, massKg } = this.coeffs;

    const gravityAcceleration = -kGVolts / kAVoltSecondSquaredPerM;
    const emfAcceleration = (-kVVoltSecondPerM * velMps) / kAVoltSecondSquaredPerM;
    const controlAcceleration = inputVolts / kAVoltSecondSquaredPerM;

    let springAccel = 0;
    let dashpotAccel = 0;

    if (posM > this.maxHeightM) {
      springAccel = (posM - this.maxHeightM) * -100_000;
      dashpotAccel = -100 * velMps;
    } else if (posM < this.minHeightM) {
      springAccel = posM * -100_000;
      dashpotAccel = -100 * velMps;
    }

    const accelMps2 =
      gravityAcceleration +
      emfAcceleration +
      controlAcceleration +
      springAccel +
      dashpotAccel;

    return [velMps, accelMps2];
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
