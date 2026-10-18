// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.Volts;

import choreo.auto.AutoFactory;
import edu.wpi.first.hal.AllianceStationID;
import edu.wpi.first.units.Units;
import edu.wpi.first.util.sendable.Sendable;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.Threads;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import frc.lib.bases.RobotVisualizer;
import frc.lib.io.MotorIO.Setpoint;
import frc.lib.io.battery.BatteryCheckerIO;
import frc.lib.logging.LogUtil.GcStatsCollector;
import frc.lib.logging.LoggedTracer;
import frc.lib.rebuilt.ShiftUtil;
import frc.lib.sim.field.rebuilt.FieldSim;
import frc.lib.sim.field.rebuilt.ShotVisualizer;
import frc.lib.util.DriveCoastOutRequest;
import frc.lib.util.Stopwatch;
import frc.robot.autos.AutoHelpers;
import frc.robot.autos.AutoModeSelector;
import frc.robot.controlboard.ControlBoard;
import frc.robot.mechviz.RebuiltRobotVisualizer;
import frc.robot.shooting.Shooting;
import frc.robot.shooting.driveplanner.DynamicShootingPlannerConstants.HubDynamicShootingConstants;
import frc.robot.subsystems.climber.Climber;
import frc.robot.subsystems.climber.ClimberConstants;
import frc.robot.subsystems.drive.Drive;
import frc.robot.subsystems.drive.DriveConstants;
import frc.robot.subsystems.feederrollers.FeederRollers;
import frc.robot.subsystems.hood.Hood;
import frc.robot.subsystems.hood.HoodConstants;
import frc.robot.subsystems.hopperrollers.HopperRollers;
import frc.robot.subsystems.intakedeploy.IntakeDeploy;
import frc.robot.subsystems.intakedeploy.IntakeDeployConstants;
import frc.robot.subsystems.leds.LEDs;
import frc.robot.subsystems.vision.Cameras;
import frc.robot.subsystems.vision.CamerasConstants.PipelineConstants;
import java.util.HashMap;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BooleanSupplier;

public class Robot extends TimedRobot {
	private Command m_autonomousCommand;
	private AutoModeSelector mAutoModeSelector;
	private long disabledCounter = 0;

	private Stopwatch coastStopwatch = new Stopwatch();

	private final BatteryCheckerIO batteryChecker;
	private BooleanSupplier coastOutToggle;

	private RobotVisualizer visualizer = null;

	public static boolean resetPoseForAuto = false;

	private final GcStatsCollector m_gcStatsCollector = new GcStatsCollector();

	public Robot() {
		RobotConstants.mAutoFactory = new AutoFactory(
				Drive.mInstance::getPose,
				Drive.mInstance.getGeneratedDrive()::resetPose,
				Drive.mInstance::followChoreoTrajectory,
				true,
				Drive.mInstance);

		AutoHelpers.bindEventMarkers(RobotConstants.mAutoFactory);

		mAutoModeSelector = new AutoModeSelector(RobotConstants.mAutoFactory);
		SmartDashboard.putBoolean("Coast After Auto", false);
		coastOutToggle = () -> SmartDashboard.getBoolean("Coast After Auto", false);

		RobotModeTriggers.autonomous()
				.onFalse(Commands.either(
								Commands.runOnce(() -> {
									Drive.mInstance.setSwerveRequest(new DriveCoastOutRequest());
									Drive.mInstance.getGeneratedDrive().setControl(new DriveCoastOutRequest());
								}),
								Commands.runOnce(() -> {
									Drive.mInstance.setSwerveRequest(DriveConstants.EMPTY_SWERVE_REQUEST);
									Drive.mInstance.getGeneratedDrive().setControl(DriveConstants.EMPTY_SWERVE_REQUEST);
								}),
								coastOutToggle)
						.ignoringDisable(true));

		batteryChecker = BatteryCheckerConstants.createBatteryChecker();

		// Log active commands
		Map<String, Integer> commandCounts = new HashMap<>();
		BiConsumer<Command, Boolean> logCommandFunction = (Command command, Boolean active) -> {
			String name = command.getName();
			int count = commandCounts.getOrDefault(name, 0) + (active ? 1 : -1);
			commandCounts.put(name, count);
			SmartDashboard.putBoolean(
					"Commands/Unique/" + name + "_" + Integer.toHexString(command.hashCode()), active);
			SmartDashboard.putBoolean("Commands/All/" + name, count > 0);
		};

		SmartDashboard.putBoolean("isEpsilon", RobotConstants.isEpsilon);
		SmartDashboard.putBoolean("isGamma", RobotConstants.isGamma);

		CommandScheduler.getInstance()
				.onCommandInitialize((Command command) -> logCommandFunction.accept(command, true));
		CommandScheduler.getInstance().onCommandFinish((Command command) -> logCommandFunction.accept(command, false));
		CommandScheduler.getInstance()
				.onCommandInterrupt((Command command) -> logCommandFunction.accept(command, false));
		batteryChecker.disable();

		CommandScheduler.getInstance().schedule(RobotConstants.mAutoFactory.warmupCmd());
	}

	@Override
	public void robotInit() {
		ControlBoard.mInstance.configureBindings();

		if (Robot.isReal()) {
			DataLogManager.start("/U/logs");
			DriverStation.startDataLog(DataLogManager.getLog());
		}
		RobotController.setBrownoutVoltage(Volts.of(5.5));

		for (Sendable sendable : RobotConstants.LOGGED_SENDABLES) {
			SmartDashboard.putData(sendable);
		}
		SmartDashboard.putData("HUB DATA Near", HubDynamicShootingConstants.LOCK_CONTROLLER);
		SmartDashboard.putData("Translation Auto Align Controller", DriveConstants.mAutoAlignTranslationController);
		SmartDashboard.putData("Auto Mode Selector", mAutoModeSelector.getAutoChooser());
		SmartDashboard.putData("DRIVE HEADING ", DriveConstants.SWERVE_HEADING_CONTROLELR);
		SmartDashboard.putData(Shooting.m_lookAheadTracker);
		Cameras.mInstance.setPipeline(PipelineConstants.APRIL_TAG_HUB_FIELD);
	}

	@Override
	public void robotPeriodic() {

		LoggedTracer.reset();

		try {
			Threads.setCurrentThreadPriority(true, 10);

			double commandSchedulerStart = Timer.getTimestamp();
			Shooting.mInstance.periodic();
			SmartDashboard.putNumber("Current Timestamp Seconds", Timer.getFPGATimestamp());
			CommandScheduler.getInstance().run();
			double commandSchedulerEnd = Timer.getTimestamp();
			LoggedTracer.record("Commands");
			m_gcStatsCollector.update();
			SmartDashboard.putNumber(
					"Logged Robot/Loop Cycle Time Milliseconds",
					(commandSchedulerEnd - commandSchedulerStart) * 1000.0);
			Threads.setCurrentThreadPriority(false, 0);
		} catch (Exception e) {
			SmartDashboard.putString("Error/Last Loop Error/Last Error Message", e.getMessage());
			SmartDashboard.putNumber("Error/Last Loop Error/Last Error Timestamp", Timer.getFPGATimestamp());
		}
	}

	@Override
	public void disabledInit() {
		LEDs.mInstance.clearStates();
		disabledCounter = 0;
		Hood.mInstance.applySetpoint(Setpoint.withCoastSetpoint());
		IntakeDeploy.mInstance.applySetpoint(Setpoint.withCoastSetpoint());
	}

	@Override
	public void disabledPeriodic() {
		disabledCounter++;
		if (Robot.isReal()) {
			batteryChecker.periodic();
		}

		updateAlliance();
		if (disabledCounter % 50 == 0) {
			if (IntakeDeploy.mInstance.getPosition().gte(IntakeDeployConstants.kStowedAngle)) {
				IntakeDeploy.mInstance.setCurrentPosition(IntakeDeployConstants.kStowedAngle);
			} else if (IntakeDeploy.mInstance.getPosition().lte(IntakeDeployConstants.kDeployedAngle)) {
				IntakeDeploy.mInstance.setCurrentPosition(IntakeDeployConstants.kDeployedAngle);
			}

			if (Hood.mInstance.getPosition().lte(HoodConstants.kMinAngle)) {
				Hood.mInstance.setCurrentPosition(HoodConstants.kMinAngle);
			}
			if (Climber.mInstance
					.getPosition()
					.lte(ClimberConstants.converter.toAngle(ClimberConstants.kStowPosition))) {
				Climber.mInstance.setCurrentPosition(
						ClimberConstants.converter.toAngle(ClimberConstants.kStowPosition));
			}
		}
		SmartDashboard.putBoolean(
				"Shift/Alliance Win Override",
				ShiftUtil.getAllianceWinOverride().orElse(false));

		coastStopwatch.startIfNotRunning();

		if (coastStopwatch.getTime().gte(Units.Seconds.of(5.0))) {
			Climber.mInstance.applySetpoint(Setpoint.withCoastSetpoint());
		}

		if (resetPoseForAuto) {
			Drive.mInstance.resetPose(mAutoModeSelector.getSelectedAutoStartingPose());
			resetPoseForAuto = false;
		}
	}

	public void updateAlliance() {
		if (Robot.isSimulation()) {
			RobotConstants.isRedAlliance = DriverStationSim.getAllianceStationId() == AllianceStationID.Red1
					|| DriverStationSim.getAllianceStationId() == AllianceStationID.Red2
					|| DriverStationSim.getAllianceStationId() == AllianceStationID.Red3;
		} else {
			DriverStation.getAlliance()
					.ifPresentOrElse(
							alliance -> RobotConstants.isRedAlliance = alliance == DriverStation.Alliance.Red, () -> {
								SmartDashboard.putNumber("Last unable to set alliance", Timer.getFPGATimestamp());
							});
		}
	}

	@Override
	public void disabledExit() {}

	@Override
	public void autonomousInit() {
		m_autonomousCommand = mAutoModeSelector.getSelectedCommand();

		if (m_autonomousCommand != null) {
			CommandScheduler.getInstance().schedule(m_autonomousCommand);
		}
	}

	@Override
	public void autonomousPeriodic() {}

	@Override
	public void autonomousExit() {
		Climber.mInstance.applySetpoint(Setpoint.withCoastSetpoint());
	}

	@Override
	public void teleopInit() {
		Drive.mInstance.setSwerveRequest(DriveConstants.EMPTY_SWERVE_REQUEST);
		Drive.mInstance.configDrivetainCurrent(DriveConstants.getTeleConfig());
		if (m_autonomousCommand != null) {
			m_autonomousCommand.cancel();
		}
		CommandScheduler.getInstance().clearComposedCommands();
		LEDs.mInstance.clearStates();
		ShiftUtil.initialize();
		FeederRollers.mInstance.applySetpoint(FeederRollers.IDLE);
		HopperRollers.mInstance.applySetpoint(HopperRollers.IDLE);
	}

	@Override
	public void teleopPeriodic() {
		ShiftUtil.publishShiftInfo();
	}

	@Override
	public void teleopExit() {
		coastStopwatch.resetAndStart();
	}

	@Override
	public void testInit() {
		CommandScheduler.getInstance().cancelAll();
	}

	@Override
	public void testPeriodic() {}

	@Override
	public void testExit() {}

	@Override
	public void simulationInit() {
		visualizer = new RebuiltRobotVisualizer();
		visualizer.init();
	}

	@Override
	public void simulationPeriodic() {
		FieldSim.mInstance.update();
		ShotVisualizer.mInstance.update();
		if (visualizer == null) {
			visualizer = new RebuiltRobotVisualizer();
			SmartDashboard.putNumber("Last failed to initialize sim properly", Timer.getFPGATimestamp());
		}
		visualizer.loop();
	}
}
