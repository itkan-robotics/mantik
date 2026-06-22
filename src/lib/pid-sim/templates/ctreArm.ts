import type { ArmPlantConfig, TuningConfig } from '../types';
import { armPlantConstantsBlock } from './armPlantConstants';

export function ctreArmTemplate(config: TuningConfig, plant: ArmPlantConfig): string {
  return `// CTRE Talon FX on-controller PID arm subsystem
// Edit Slot0 gains and setpoint below, then run the simulation.
// Setpoint and motion limits are in MOTOR ROTATIONS (encoder units).

package frc.robot.subsystems;

import com.ctre.phoenix6.configs.Slot0Configs;
import com.ctre.phoenix6.configs.TalonFXConfiguration;
import com.ctre.phoenix6.controls.PositionVoltage;
import com.ctre.phoenix6.hardware.TalonFX;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class ArmSubsystem extends SubsystemBase {

${armPlantConstantsBlock(plant)}

  // --- TUNING: Slot0 PID + feedforward (kG · cos(angle) on real hardware) ---
  private static final double kP = ${config.kP};
  private static final double kI = ${config.kI};
  private static final double kD = ${config.kD};
  private static final double kS = ${config.kS};
  private static final double kG = ${config.kG};
  private static final double kV = ${config.kV};
  private static final double kA = ${config.kA};

  // --- TUNING: motion limits (rot/s, rot/s²) ---
  private static final double kMaxVelocity = ${config.maxVelocity};
  private static final double kMaxAccel = ${config.maxAccel};

  // --- TUNING: setpoint (motor rotations) ---
  private static final double kSetpoint = ${config.setpoint};

  private final TalonFX motor = new TalonFX(2);
  private final PositionVoltage positionRequest = new PositionVoltage(0);

  public ArmSubsystem() {
    TalonFXConfiguration cfg = new TalonFXConfiguration();
    Slot0Configs slot0 = cfg.Slot0;
    slot0.kP = kP;
    slot0.kI = kI;
    slot0.kD = kD;
    slot0.kS = kS;
    slot0.kG = kG;
    slot0.kV = kV;
    slot0.kA = kA;
    cfg.MotionMagic.MotionMagicCruiseVelocity = kMaxVelocity;
    cfg.MotionMagic.MotionMagicAcceleration = kMaxAccel;
    motor.getConfigurator().apply(cfg);
  }

  public Command goToSetpoint() {
    return runOnce(() -> motor.setControl(positionRequest.withPosition(kSetpoint)));
  }

  /** Move to a fraction of soft travel (0 = soft min, 1 = soft max angle). */
  public void goToTravelFraction(double fraction) {
    double angleDeg = kSoftMinDeg + fraction * (kSoftMaxDeg - kSoftMinDeg);
    double rotations = angleDeg * kGearRatio / 360.0;
    motor.setControl(positionRequest.withPosition(rotations));
  }

  @Override
  public void periodic() {
    // Telemetry published to SmartDashboard / AdvantageScope on real robot
  }
}
`;
}
