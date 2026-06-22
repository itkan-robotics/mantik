export function ctreRobotTemplate(): string {
  return `// Robot.java — runs subsystems during teleop (Timed Robot template)
// Read-only reference: this is where your elevator subsystem is used.

package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import frc.robot.subsystems.ElevatorSubsystem;

public class Robot extends TimedRobot {

  private final ElevatorSubsystem m_elevator = new ElevatorSubsystem();

  @Override
  public void teleopPeriodic() {
    // During driver control, command the elevator to its setpoint.
    m_elevator.goToSetpoint();
  }

  // Command Robot equivalent (RobotContainer constructor — bind once at init):
  //   CommandXboxController driver = new CommandXboxController(0);
  //   driver.a().onTrue(new InstantCommand(() -> m_elevator.goToTravelFraction(0.0), m_elevator));
  //   driver.b().onTrue(new InstantCommand(() -> m_elevator.goToTravelFraction(0.25), m_elevator));
  //   driver.x().onTrue(new InstantCommand(() -> m_elevator.goToTravelFraction(0.50), m_elevator));
  //   driver.y().onTrue(new InstantCommand(() -> m_elevator.goToTravelFraction(0.75), m_elevator));
  //   driver.rightBumper().onTrue(new InstantCommand(() -> m_elevator.goToTravelFraction(1.0), m_elevator));
  // Trigger.onTrue() schedules on rising edge (button press). See WPILib "Binding Commands to Triggers".
  //
  // Browser sim: Teleop Presets panel maps Q/W/E/R/T to the same travel fractions and updates kSetpoint.

  @Override
  public void robotPeriodic() {
    // Runs every 20 ms in all modes — useful for telemetry.
  }
}
`;
}
