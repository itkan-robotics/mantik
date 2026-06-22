export function revRobotTemplate(): string {
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

  @Override
  public void robotPeriodic() {
    // Runs every 20 ms in all modes — useful for telemetry.
  }
}
`;
}
