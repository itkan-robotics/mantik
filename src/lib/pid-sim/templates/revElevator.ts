import type { TuningConfig } from '../types';

export function revElevatorTemplate(config: TuningConfig): string {
  return `// REV Spark MAX elevator subsystem
// Edit tuning constants below, then run the simulation.

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

public class ElevatorSubsystem extends SubsystemBase {

  // --- PLANT (future: editable) ---
  // massLbs = 16, travel 0–3 m, start 0.5 m, gearing 12:1, drum circ ≈ 0.14 m

  // --- TUNING: closed-loop PID ---
  private static final double kP = ${config.kP};
  private static final double kI = ${config.kI};
  private static final double kD = ${config.kD};

  // --- TUNING: feedforward (applied via WPILib-style constants) ---
  private static final double kS = ${config.kS};
  private static final double kG = ${config.kG};
  private static final double kV = ${config.kV};

  // --- TUNING: motion limits ---
  private static final double kMaxVelocity = ${config.maxVelocity};
  private static final double kMaxAccel = ${config.maxAccel};

  // --- TUNING: setpoint (meters) ---
  private static final double kSetpoint = ${config.setpoint};

  private final SparkMax m_motor = new SparkMax(1, MotorType.kBrushless);
  private final SparkClosedLoopController m_pid = m_motor.getClosedLoopController();

  public ElevatorSubsystem() {
    SparkMaxConfig cfg = new SparkMaxConfig();
    cfg.idleMode(IdleMode.kBrake);
    cfg.closedLoop.p(kP).i(kI).d(kD);
    cfg.closedLoop.maxMotion.maxVelocity(kMaxVelocity).maxAcceleration(kMaxAccel);
    m_motor.configure(cfg, ResetMode.kResetSafeParameters, PersistMode.kPersistParameters);
  }

  /** Command elevator to the configured setpoint height. */
  public void goToSetpoint() {
    m_pid.setReference(kSetpoint, ControlType.kPosition);
  }

  @Override
  public void periodic() {
    // On a real robot, publish telemetry to SmartDashboard / AdvantageScope here.
  }
}
`;
}
