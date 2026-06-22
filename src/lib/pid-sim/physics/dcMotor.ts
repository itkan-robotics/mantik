/** WPILib DCMotor constants — ported from edu.wpi.first.math.system.plant.DCMotor */

const RPM_TO_RAD_PER_SEC = (rpm: number) => (rpm * 2 * Math.PI) / 60;

export interface DCMotorModel {
  nominalVoltageVolts: number;
  stallTorqueNewtonMeters: number;
  stallCurrentAmps: number;
  freeCurrentAmps: number;
  freeSpeedRadPerSec: number;
  rOhms: number;
  KvRadPerSecPerVolt: number;
  KtNMPerAmp: number;
}

function createMotor(
  nominalVoltageVolts: number,
  stallTorqueNewtonMeters: number,
  stallCurrentAmps: number,
  freeCurrentAmps: number,
  freeSpeedRpm: number,
  numMotors: number,
): DCMotorModel {
  const stallTorque = stallTorqueNewtonMeters * numMotors;
  const stallCurrent = stallCurrentAmps * numMotors;
  const freeCurrent = freeCurrentAmps * numMotors;
  const freeSpeedRadPerSec = RPM_TO_RAD_PER_SEC(freeSpeedRpm);
  const rOhms = nominalVoltageVolts / stallCurrent;
  const KvRadPerSecPerVolt =
    freeSpeedRadPerSec / (nominalVoltageVolts - rOhms * freeCurrent);
  const KtNMPerAmp = stallTorque / stallCurrent;

  return {
    nominalVoltageVolts,
    stallTorqueNewtonMeters: stallTorque,
    stallCurrentAmps: stallCurrent,
    freeCurrentAmps: freeCurrent,
    freeSpeedRadPerSec,
    rOhms,
    KvRadPerSecPerVolt,
    KtNMPerAmp,
  };
}

/** Matches mantik-pid-practice ElevatorSubsystem (SparkWrapper + DCMotor.getNEO(1)). */
export function getNeo(numMotors = 1): DCMotorModel {
  return createMotor(12, 2.6, 105, 1.8, 5676, numMotors);
}

export function getNeo550(numMotors = 1): DCMotorModel {
  return createMotor(12, 0.97, 100, 1.4, 11000, numMotors);
}

export function getKrakenX60(numMotors = 1): DCMotorModel {
  return createMotor(12, 7.09, 366, 2, 6000, numMotors);
}

/** Voltage needed to produce torque at a given angular velocity (WPILib DCMotor.getVoltage). */
export function getVoltage(
  motor: DCMotorModel,
  torqueNm: number,
  speedRadPerSec: number,
): number {
  return (
    (1 / motor.KvRadPerSecPerVolt) * speedRadPerSec +
    (1 / motor.KtNMPerAmp) * motor.rOhms * torqueNm
  );
}

/** Motor current draw at speed and applied voltage (WPILib DCMotor.getCurrent). */
export function getCurrent(
  motor: DCMotorModel,
  angularVelocityRadPerSec: number,
  appliedVoltage: number,
): number {
  return (
    motor.freeCurrentAmps +
    (appliedVoltage - angularVelocityRadPerSec / motor.KvRadPerSecPerVolt) / motor.rOhms
  );
}
