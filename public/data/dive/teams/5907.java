// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.MetersPerSecond;

import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.trajectory.Trajectory;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Joystick;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.smartdashboard.Field2d;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.InstantCommand;
import edu.wpi.first.wpilibj2.command.ParallelCommandGroup;
import edu.wpi.first.wpilibj2.command.RunCommand;
import frc.robot.SMF.StateMachine;
import frc.robot.controllers.ControllerBindings;
import frc.robot.controllers.DefaultControllerBindings;
import frc.robot.util.AllianceManager;
import frc.robot.util.AutoCommand;
import frc.robot.generated.TunerConstants;
import frc.robot.subsystems.drivetrain.CommandSwerveDrivetrain;
import frc.robot.subsystems.drivetrain.StatefulDrivetrain;
import frc.robot.subsystems.shooter.Shooter;
import frc.robot.subsystems.shooter.launcher.LauncherIOReal;
import frc.robot.subsystems.shooter.turret.TurretIOReal;
import frc.robot.subsystems.vision.Vision;
import frc.robot.util.AutoManager;
import frc.robot.util.Elastic;

public class RobotContainer extends StateMachine<RobotContainer.State> {

	private final CommandSwerveDrivetrain tunerDrivetrain;
	private final StatefulDrivetrain drivetrain;

	private final Vision vision;
	private final AutoManager autoManager;

	private final Field2d preMatchField = new Field2d();

	private ControllerBindings controllerBindings = new DefaultControllerBindings();

	private final Shooter shooter;

	public RobotContainer() {
		super("RobotContainer", State.PRE_MATCH, State.class);

		tunerDrivetrain = TunerConstants.createDrivetrain(); // tuner generated drivetrain
		drivetrain = new StatefulDrivetrain( // main robot drivetrain
				tunerDrivetrain,
				TunerConstants.kSpeedAt12Volts.abs(MetersPerSecond),
				Constants.Drivetrain.MAX_ANGULAR_RATE,
				controllerBindings::getDriveStrafeValue, // Strafe
				controllerBindings::getDriveForwardValue, // Forward
				controllerBindings::getDriveTurnValue // Rotation
		);

		autoManager = new AutoManager(Constants.Autonomous.AUTO_PATHS); // Load autos from constants, and from
																		// pathplanner

		vision = new Vision(
				Constants.Vision.CAMERAS,
				Constants.Vision.FIELD_LAYOUT);

		vision.addListener(tunerDrivetrain::addVisionMeasurements); // the tuner drivetrain gets vision updates, which
																	// feeds into the main drivetrain

		SmartDashboard.putData("Pre-Match Field", preMatchField);

		shooter = new Shooter(new TurretIOReal(), new LauncherIOReal(),
				drivetrain::getPose,
				drivetrain::getSpeeds);

		registerStateCommands();
		registerStateTransitions();

		configureBindings();

		addChildSubsystem(drivetrain);
	}

	private void configureBindings() {
		controllerBindings.resetPose().onTrue(new InstantCommand(() -> {
			drivetrain.resetPose();
		}));

		controllerBindings.seedHeading().onTrue(new InstantCommand(() -> {
			drivetrain.resetHeading();
		}));

		controllerBindings.xShape()
				.onTrue(drivetrain.transitionCommand(StatefulDrivetrain.State.X_SHAPE))
				.onFalse(drivetrain.transitionCommand(StatefulDrivetrain.State.TRAVERSING));

		controllerBindings.fullOverride().onTrue(transitionCommand(State.OVERRIDE));
	}

	public Command getAutonomousCommand() {
		return autoManager.getSelectedAuto();
	}

	@Override
	protected void determineSelf() {
		setState(State.PRE_MATCH);
	}

	private void registerStateTransitions() {
		addOmniTransition(State.DISABLED);
		addOmniTransition(State.PRE_MATCH);
		addOmniTransition(State.AUTONOMOUS);
		addOmniTransition(State.TELEOP);
		addOmniTransition(State.TEST);
		addOmniTransition(State.OVERRIDE);
	}

	private void registerStateCommands() {
		registerStateCommand(State.DISABLED, drivetrain.transitionCommand(StatefulDrivetrain.State.IDLE));

		registerStateCommand(State.PRE_MATCH, new InstantCommand());

		registerStateCommand(State.AUTONOMOUS, new InstantCommand(() -> {
			AutoCommand auto = autoManager.getSelectedAuto();
			CommandScheduler.getInstance().schedule(auto);
		}));

		registerStateCommand(State.TELEOP, new ParallelCommandGroup(
			drivetrain.transitionCommand(StatefulDrivetrain.State.TRAVERSING),
			shooter.transitionCommand(Shooter.State.SHOOTING_HUB),
			new RunCommand(()->{

			})
		));

		registerStateCommand(State.TEST, new InstantCommand(() -> {
			drivetrain.requestTransition(StatefulDrivetrain.State.TRAVERSING);
			SmartDashboard.putData("Run Auto", new InstantCommand(() -> {
				drivetrain.requestTransition(StatefulDrivetrain.State.IDLE);
				Command auto = autoManager.getSelectedAuto()
						.andThen(drivetrain.transitionCommand(StatefulDrivetrain.State.TRAVERSING));
				CommandScheduler.getInstance().schedule(auto);
			}));
		}));

		registerStateCommand(State.OVERRIDE, new ParallelCommandGroup(
				shooter.transitionCommand(Shooter.State.SHOOTING_STATIC)
		));
	}

	@Override
	protected void update() {
		vision.updateEstimates();
		displayDashboardObjects();
		preMatchField.setRobotPose(drivetrain.getPose());
		if (getState() == State.PRE_MATCH) {
			handlePreMatchProcesses();
		}
	}

	@Override
	protected void onTeleopStart() {
		requestTransition(State.TELEOP);
		drivetrain.syncHeading();
		Elastic.selectTab("Teleoperated");
	}

	@Override
	protected void onAutonomousStart() {
		requestTransition(State.AUTONOMOUS);
		Elastic.selectTab("Autonomous");
	}

	@Override
	protected void onTestStart() {
		requestTransition(State.TEST);
	}

	@Override
	protected void onDisable() {
		requestTransition(State.DISABLED);
	}

	private void handlePreMatchProcesses() {
		// Display Autonomous Trajectory and Starting Pose
		AutoCommand auto = autoManager.getSelectedAuto();
		String color = "#00FF00";
		if (auto != null) {
			Trajectory traj = auto.getTrajectory();
			if (AllianceManager.getAlliance() == DriverStation.Alliance.Red) {
				traj = AutoCommand.flipTrajectory(traj);
			}
			if (traj.getStates().size() > 0) {
				preMatchField.getObject("AutoTrajectory").setTrajectory(traj);
				preMatchField.getObject("FollowPose").setPose(followDisplayTrajectory(traj));
				preMatchField.getObject("StartingPose").setPose(traj.getInitialPose());
				Double translationError = tunerDrivetrain.getPose().getTranslation()
						.getDistance(traj.getInitialPose().getTranslation());
				Double rotationError = Math.abs(tunerDrivetrain.getPose().getRotation().getDegrees()
						- traj.getInitialPose().getRotation().getDegrees());
				if (translationError < 0.05 && rotationError < 5.0) {
					color = "#00FF00";
				} else if (translationError < 0.2 && rotationError < 15.0) {
					color = "#FFAA00";
				} else {
					color = "#FF0000";
				}
			} else {
				preMatchField.getObject("AutoTrajectory").setTrajectory(new Trajectory());
				preMatchField.getObject("FollowPose").setPose(tunerDrivetrain.getPose());
				preMatchField.getObject("StartingPose").setPose(tunerDrivetrain.getPose());
			}
		} else {
			preMatchField.getObject("AutoTrajectory").setTrajectory(new Trajectory());
			preMatchField.getObject("FollowPose").setPose(tunerDrivetrain.getPose());
			preMatchField.getObject("StartingPose").setPose(tunerDrivetrain.getPose());
		}
		SmartDashboard.putString("Starting Proximity", color);
	}

	private void displayDashboardObjects() {
		SmartDashboard.putBoolean("FMS Connected", DriverStation.isFMSAttached());
		SmartDashboard.putString("Alliance", AllianceManager.getAlliance().toString());
		SmartDashboard.putNumber("Match Time", DriverStation.getMatchTime());
		SmartDashboard.putNumber("Battery Voltage", RobotController.getBatteryVoltage());
	}

	private Pose2d followDisplayTrajectory(Trajectory traj) {
		Double realTime = Timer.getFPGATimestamp();
		Double totalTime = traj.getTotalTimeSeconds();
		Double deltaTime = realTime % totalTime;
		Trajectory.State sample = traj.sample(deltaTime);
		return sample.poseMeters;
	}

	public void simulationPeriodic() {
		vision.updateSimPose(drivetrain.getPose());
	}

	public enum State {
		UNDETERMINED,
		DISABLED,
		PRE_MATCH,
		AUTONOMOUS,
		TELEOP,
		OVERRIDE,
		TEST
	}
}
