import type { ArmPlantConfig, TuningConfig } from '../types';
import { armPlantConstantsBlock } from './armPlantConstants';

export function revArmTemplate(config: TuningConfig, plant: ArmPlantConfig): string {
  return `// REV Spark MAX arm subsystem
// Edit tuning constants below, then run the simulation.
// Setpoint and motion limits are in MOTOR ROTATIONS (encoder units).

package frc.robot.subsystems;

import com.revrobotics.spark.SparkMax;
import com.revrobotics.spark.SparkLowLevel.MotorType;
import com.revrobotics.spark.SparkClosedLoopController;
import com.revrobotics.spark.config.SparkMaxConfig;
import com.revrobotics.spark.config.SparkBaseConfig.IdleMode;
import com.revrobotics.spark.SparkBase.ResetMode;
import com.revrobotics.spark.SparkBase.PersistMode;
import com.revrobotics.spark.ClosedLoopController.ControlType;
import edu.wpi.first.wpilibj2.command.SubsystemBase;

public class ArmSubsystem extends SubsystemBase {

${armPlantConstantsBlock(plant)}

  // --- TUNING: closed-loop PID (V/rot, V·s/rot, V/(rot/s)) ---
  private static final double kP = ${config.kP};
  private static final double kI = ${config.kI};
  private static final double kD = ${config.kD};

  // --- TUNING: feedforward (kG is multiplied by cos(angle) on a real arm) ---
  private static final double kS = ${config.kS};
  private static final double kG = ${config.kG};
  private static final double kV = ${config.kV};
  private static final double kA = ${config.kA};

  // --- TUNING: motion limits (motor rotations / rot/s / rot/s²) ---
  private static final double kMaxVelocity = ${config.maxVelocity};
  private static final double kMaxAccel = ${config.maxAccel};

  // --- TUNING: setpoint (motor rotations) ---
  private static final double kSetpoint = ${config.setpoint};

  private final SparkMax m_motor = new SparkMax(2, MotorType.kBrushless);
  private final SparkClosedLoopController m_pid = m_motor.getClosedLoopController();

  public ArmSubsystem() {
    SparkMaxConfig cfg = new SparkMaxConfig();
    cfg.idleMode(IdleMode.kBrake);
    cfg.closedLoop.p(kP).i(kI).d(kD);
    cfg.closedLoop.maxMotion.maxVelocity(kMaxVelocity).maxAcceleration(kMaxAccel);
    m_motor.configure(cfg, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
  }

  /** Command arm to the configured setpoint (motor rotations). */
  public void goToSetpoint() {
    m_pid.setReference(kSetpoint, ControlType.kPosition);
  }

  /** Move to a fraction of soft travel (0 = soft min, 1 = soft max angle). */
  public void goToTravelFraction(double fraction) {
    double angleDeg = kSoftMinDeg + fraction * (kSoftMaxDeg - kSoftMinDeg);
    double rotations = angleDeg * kGearRatio / 360.0;
    m_pid.setReference(rotations, ControlType.kPosition);
  }

  @Override
  public void periodic() {
    // On a real robot, publish telemetry to SmartDashboard / AdvantageScope here.
  }
}
`;
}
