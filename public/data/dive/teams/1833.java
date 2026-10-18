// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import frc.robot.autoalign.Autoalign;
import frc.robot.autoalign.Autoscoring;
import frc.robot.constants.AutoalignConstants;
import frc.robot.constants.FlywheelConstants;
import frc.robot.constants.LEDConstants;
import frc.robot.constants.LocalizationConstants.LocalizationMode;
import frc.robot.constants.SharedData;
import frc.robot.constants.SwerveConstants;

import com.ctre.phoenix6.SignalLogger;
import com.ctre.phoenix6.signals.InvertedValue;
import com.pathplanner.lib.auto.NamedCommands;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.GenericHID.RumbleType;
import frc.robot.utils.AllianceFlipUtils;
import frc.robot.utils.FireRateCalculator;
import frc.robot.utils.HubUtils;
import frc.robot.utils.LocalizationUtils;
import frc.robot.utils.SwerveDriveUtils;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.wpilibj2.command.ConditionalCommand;
import edu.wpi.first.wpilibj2.command.InstantCommand;
import edu.wpi.first.wpilibj2.command.ParallelCommandGroup;
import edu.wpi.first.wpilibj2.command.SequentialCommandGroup;
import edu.wpi.first.wpilibj2.command.WaitCommand;
import edu.wpi.first.wpilibj2.command.WaitUntilCommand;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.autos.AutonChooser;
import frc.robot.constants.FeatureFlagConstants;
import frc.robot.constants.FieldConstants;
import frc.robot.constants.HoodConstants;
import frc.robot.constants.TunerConstants;
import frc.robot.constants.VisionConstants;
import frc.robot.constants.AutoalignConstants.Target;
import frc.robot.subsystems.DrivetrainSubsystem;
import frc.robot.subsystems.FlywheelSubsystem;
import frc.robot.subsystems.HoodSubsystem;
import frc.robot.subsystems.IndexerSubsystem;
import frc.robot.subsystems.IntakeSubsystem;
import frc.robot.subsystems.LEDSubsystem;
import frc.robot.subsystems.PrimerSubsystem;
import frc.robot.utils.ShootOnTheMoveUtils;
import frc.robot.utils.ShooterMechanicsUtils;
import frc.robot.utils.ShooterSuperstructure;
import frc.robot.vision.CameraSettings;
import frc.robot.vision.Vision;

public class Robot extends TimedRobot {
  private Command m_autonomousCommand;
  private final LEDSubsystem ledSubsystem = new LEDSubsystem();
  private final DrivetrainSubsystem drivetrain = TunerConstants.createDrivetrain();
  private final CommandXboxController joystick = new CommandXboxController(0);
  private final OperatorControls operatorControls = new OperatorControls(1);



  private final IntakeSubsystem intakeSubsystem = new IntakeSubsystem();
  private final HoodSubsystem hoodSubsystem = new HoodSubsystem();
  private final PrimerSubsystem primerSubsystem = new PrimerSubsystem();
  private final FlywheelSubsystem[] flywheelSubsystems = {
      new FlywheelSubsystem(FlywheelConstants.kFlywheelMotorLeftOutterID, InvertedValue.CounterClockwise_Positive),
      new FlywheelSubsystem(FlywheelConstants.kFlywheelMotorLeftInnerID, InvertedValue.CounterClockwise_Positive),
      new FlywheelSubsystem(FlywheelConstants.kFlywheelMotorRightOutterID, InvertedValue.Clockwise_Positive),
      new FlywheelSubsystem(FlywheelConstants.kFlywheelMotorRightInnerID, InvertedValue.Clockwise_Positive)
  };
  private final IndexerSubsystem indexerSubsystem = new IndexerSubsystem();

  private final SwerveDriveUtils swerveUtil = new SwerveDriveUtils(
      drivetrain,
      () -> MathUtil.applyDeadband(joystick.getLeftY(), SwerveConstants.kJoystickDeadband),
      () -> MathUtil.applyDeadband(joystick.getLeftX(), SwerveConstants.kJoystickDeadband),
      () -> -1 * MathUtil.applyDeadband(joystick.getRightX(), SwerveConstants.kJoystickDeadband));

  private final FireRateCalculator fireRateCalculator = new FireRateCalculator(primerSubsystem, flywheelSubsystems);

  private final ShooterSuperstructure shooterSuperstructure = new ShooterSuperstructure(hoodSubsystem, primerSubsystem,
      indexerSubsystem, intakeSubsystem, ledSubsystem, drivetrain, swerveUtil, fireRateCalculator, flywheelSubsystems);

  public final Vision vision = new Vision(drivetrain::addVisionMeasurement, drivetrain, intakeSubsystem);

  private final Autoalign autoalign = new Autoalign(() -> new Autoalign.AutoalignData(
      HubUtils.isAllianceHubActive(SharedData.kAllianceColor),
      HubUtils.secondsUntilShiftChange(SharedData.kAllianceColor),
      operatorControls.getHopperStatus(), swerveUtil.getPose(), vision.isLocalized()), swerveUtil, drivetrain);

  private final Autoscoring autoscoring = new Autoscoring(autoalign, swerveUtil, drivetrain, shooterSuperstructure,
      hoodSubsystem);

  private AutonChooser autonChooser = new AutonChooser(swerveUtil, shooterSuperstructure, autoalign, drivetrain);


  public Robot() { // banana cupcake
    // const OpenAI = require("openai");
    // System.out.println("Hello World")
    
    SignalLogger.enableAutoLogging(false);
    SignalLogger.stop();

    RobotController.setBrownoutVoltage(SharedData.kBrownOutVoltage);
    SmartDashboard.putNumber("ShooterRestingRPS", FlywheelConstants.kRestingRPS);

    configureDriveTrainDefaults();
    configureBindings();
    drivetrain.createAllianceChooser();
    SmartDashboard.putData("AutoAlign Field", SharedData.kField);
    for (CameraSettings camera : VisionConstants.kCameras) {
      SmartDashboard.putBoolean("is" + camera.getCameraName() + "Enabled", camera.isEnabled());  
    }
  }

  public void configureBindings() {
    joystick.start().onTrue(new InstantCommand(() -> {
      drivetrain.resetPose(Pose2d.kZero);
    }));

    // Intake
    joystick.leftTrigger()
        .whileTrue(intakeSubsystem.smartdashboardIntakeCommand().ignoringDisable(true))
        .whileTrue(ledSubsystem.setPatternCommand(LEDConstants.kIntaking).ignoringDisable(true))
        .onFalse(ledSubsystem.setDefaultPatternCommand().ignoringDisable(true));

    // Vomit
    joystick.leftBumper().whileTrue(shooterSuperstructure.throwUpCommand());
    

    // Shoot/Ferry
    joystick.rightTrigger().whileTrue(
        new ConditionalCommand(
            shooterSuperstructure.shootOnTheMoveCommand(swerveUtil.getPoseSupplier()),
            shooterSuperstructure.ferryOnTheMoveCommand(swerveUtil.getPoseSupplier()),

            () -> AutoalignConstants.FieldZone.ALLIANCE_ZONE.contains(swerveUtil.getPose())))
        .onFalse(intakeSubsystem.goToIntakePositionComand().andThen(ledSubsystem.setDefaultPatternCommand()));

    // Trench Assist
    joystick.rightBumper()
        .onTrue(hoodSubsystem.goToHomeCommand())
        .whileTrue(swerveUtil.assistedDrive(() -> AutoalignConstants.Action.CrossTrench).ignoringDisable(true))
        .whileTrue(intakeSubsystem.intakeComand());

    // Stow
    joystick.y().whileTrue(intakeSubsystem.StowCommand().alongWith(new WaitUntilCommand(() -> false)));

    // autoscore
    joystick.a().whileTrue(
      autoscoring.autoScoreCommand()
    ).onFalse(intakeSubsystem.goToIntakePositionComand().andThen(ledSubsystem.setDefaultPatternCommand()));


    // shooter compensation
    operatorControls.controller.povUp()
        .onTrue(new InstantCommand(() -> operatorControls.updateShooterCompensation(0.25)).ignoringDisable(true));
    operatorControls.controller.povDown()
        .onTrue(new InstantCommand(() -> operatorControls.updateShooterCompensation(-0.25)).ignoringDisable(true));

    // Set localization modes
    operatorControls.controller.x().onTrue(shooterSuperstructure.rampFlywheelsToTargetRPMRunCommand(() -> -600)
    .withTimeout(1));
    operatorControls.controller.y()
        .onTrue(new InstantCommand(() -> operatorControls.setLocalizationMode(LocalizationMode.Normal))
            .ignoringDisable(true));
    operatorControls.controller.b()
        .onTrue(new InstantCommand(() -> intakeSubsystem.setShouldPivot(false))
            .ignoringDisable(true))
        .onFalse(new InstantCommand(() -> intakeSubsystem.setShouldPivot(true))
            .ignoringDisable(true));


    // Prefire Hood
    operatorControls.controller.leftTrigger().onTrue( 
      new ParallelCommandGroup(
       hoodSubsystem.setPositionRequestInMicrosecondsRunCommand(() -> ShooterMechanicsUtils.getTargetHoodAngle(swerveUtil.getPose()))
      ))
      .onTrue(ledSubsystem.setPatternCommand(LEDConstants.kOperatorPreFire));

    // Prefire Rollers
    operatorControls.controller.rightTrigger().onTrue(
    shooterSuperstructure.rampFlywheelsToTargetRPMRunCommand(() -> ShooterMechanicsUtils.getTargetFlywheelSpeed(swerveUtil.getPose()) * 60 * 
                    (SmartDashboard.getNumber("Flywheel Compensation Percentage", 0) / 100 + 1))
    .withTimeout(10))
    .onTrue(ledSubsystem.setPatternCommand(LEDConstants.kOperatorPreFire));

    // Prefire Resting RPS (wat da aura) 
    operatorControls.controller.rightBumper().onTrue(
      new InstantCommand(() -> {
        for (FlywheelSubsystem flywheelSubsystem : flywheelSubsystems) {
          if(FlywheelSubsystem.isRestingRPSZero)  {
            flywheelSubsystem.setDefaultCommand(
              new WaitUntilCommand(() -> flywheelSubsystem.getVelocity() < SmartDashboard.getNumber("ShooterRestingRPS", FlywheelConstants.kRestingRPS))
                .andThen(flywheelSubsystem.setVelocityCommand(SmartDashboard.getNumber("ShooterRestingRPS", FlywheelConstants.kRestingRPS)))
            );
          } else {
            flywheelSubsystem.setDefaultCommand(
            new WaitUntilCommand(() -> flywheelSubsystem.getVelocity() < SmartDashboard.getNumber("ShooterRestingRPS", FlywheelConstants.kRestingRPS))
              .andThen(flywheelSubsystem.setSlowVelocityCommand(0))
            );
          }
        }
        FlywheelSubsystem.isRestingRPSZero = !FlywheelSubsystem.isRestingRPSZero;
      })
    )
    .onTrue(
      new SequentialCommandGroup(
        new InstantCommand(() -> operatorControls.controller.setRumble(RumbleType.kBothRumble, kDefaultPeriod)),
        new WaitCommand(1.0),
        new InstantCommand(() -> operatorControls.controller.setRumble(RumbleType.kBothRumble, 0))
      ).ignoringDisable(true)
    );

    // Prefire Hood for ferrying
    operatorControls.controller.leftBumper().onTrue(
    hoodSubsystem.setPositionRequestCommandInMicroseconds(1280));

    // Home hood
    operatorControls.controller.a().onTrue(hoodSubsystem.goToHomeCommand());
   
    // operatorControls.controller.leftTrigger()
    //   .onTrue(new InstantCommand(() -> Vision));


    SmartDashboard.putData("autoscore", autoscoring.autoScoreCommand());
    SmartDashboard.putData("sotm", shooterSuperstructure.shootOnTheMoveCommand(swerveUtil.getPoseSupplier(), () -> Target.HUB_SHOT));

    NamedCommands.registerCommand("startIntake", intakeSubsystem.smartdashboardAutonIntakeCommand());
    NamedCommands.registerCommand("stopIntake", intakeSubsystem.stopIntakeCommand());
    NamedCommands.registerCommand("spinup", shooterSuperstructure.rampFlywheelsToTargetRPM(ShooterMechanicsUtils.getTargetFlywheelSpeed(HoodConstants.pathplannerShotPose) * 60 * 
                    (SmartDashboard.getNumber("Flywheel Compensation Percentage", 0) / 100 + 1)));
    NamedCommands.registerCommand("zeroHood",
        shooterSuperstructure.setHoodAngleInMicroseconds((HoodConstants.kMinPulse)));
    NamedCommands.registerCommand("prefireHood", shooterSuperstructure.setHoodAngleInMicroseconds(
        ShooterMechanicsUtils.getTargetHoodAngle(HoodConstants.pathplannerShotPose)));

    drivetrain.configureAutoBuilder();
    autonChooser.createDashboardChooser();
    autonChooser.createStepDashboardChooser();

  };
  private void configureDriveTrainDefaults() {
    drivetrain.setDefaultCommand(swerveUtil.teleopDriveCommand());
  }
  
  @Override
  public void robotPeriodic() {
    SharedData.kField.setRobotPose(drivetrain.getState().Pose);
    vision.periodic();
    if (FeatureFlagConstants.kEnableShotCalculation) {
      fireRateCalculator.periodic();
    }
    
    if (FeatureFlagConstants.kEnableShootOnTheMove) {
      ShootOnTheMoveUtils.getInstance().updateEffective( 
          drivetrain.getPose(),
          ChassisSpeeds.fromRobotRelativeSpeeds(drivetrain.getState().Speeds, drivetrain.getPose().getRotation()),
          AutoalignConstants.FieldZone.ALLIANCE_ZONE.contains(swerveUtil.getPose()) ? ShooterMechanicsUtils.getClosestHub() : ShooterMechanicsUtils.getClosestFerryTarget(drivetrain.getPose()));
    
      SharedData.kField.getObject("Effective Target").setPose(ShootOnTheMoveUtils.getInstance().getEffectiveTarget());
    
    }

    swerveUtil.updateBumpStatus();

    SmartDashboard.putBoolean("On Bump", SharedData.kOnBump);

    // hoodSubsystem.checkServoCurrent();

    SmartDashboard.putNumber("Dist To Hub-Center",
        AllianceFlipUtils
            .apply(
                new Translation2d(FieldConstants.Hub.topCenterPoint.getX(), FieldConstants.Hub.topCenterPoint.getY()))
            .getDistance(swerveUtil.getPose().getTranslation()));

    SmartDashboard.putNumber("Dist To Ferry Setpoint", ShooterMechanicsUtils.getClosestFerryTarget(swerveUtil.getPose()).getTranslation().getDistance(swerveUtil.getPose().getTranslation()));

    SmartDashboard.putNumber("Interpolated Target Hood",
        ShooterMechanicsUtils.getTargetHoodAngle(drivetrain.getPose()));
    SmartDashboard.putNumber("Interpolated Target Flywheel",
        ShooterMechanicsUtils.getTargetFlywheelSpeed(drivetrain.getPose()));
    CommandScheduler.getInstance().run();

    SmartDashboard.putString("Localization Mode", LocalizationUtils.getCurrentMode().name());

    SmartDashboard.putBoolean("isIdleRPS0", FlywheelSubsystem.isRestingRPSZero);
  }

  @Override
  public void disabledInit() {
  }

  @Override
  public void disabledPeriodic() {
    if (drivetrain.allianceChanged()) {
      autonChooser.rebuildPose();
      drivetrain.resetAllianceChanged();
    }
  }

  @Override
  public void disabledExit() {
  }

  @Override
  public void autonomousInit() {
    m_autonomousCommand = autonChooser.getCurrentCommand();
    shooterSuperstructure.setHoodAngleInMicroseconds(HoodConstants.kMinPulse);
    if (m_autonomousCommand != null) {
      CommandScheduler.getInstance().schedule(m_autonomousCommand);
    }
  }

  @Override
  public void autonomousPeriodic() {
  }

  @Override
  public void autonomousExit() {
  }

  @Override
  public void teleopInit() {
    if (m_autonomousCommand != null) {
      m_autonomousCommand.cancel();
    }
    ledSubsystem.setDefaultPattern();

    // AutoalignConstants.Target.displayAllTargets();
    AutoalignConstants.FieldZone.drawAll();

    if (ShootOnTheMoveUtils.getInstance().getEffectiveTarget() == null) {
      ShootOnTheMoveUtils.getInstance().updateEffective(drivetrain.getPose(), ChassisSpeeds.fromRobotRelativeSpeeds(drivetrain.getState().Speeds, drivetrain.getPose().getRotation()), AutoalignConstants.FieldZone.ALLIANCE_ZONE.contains(swerveUtil.getPose()) ? ShooterMechanicsUtils.getClosestHub() : ShooterMechanicsUtils.getClosestFerryTarget(drivetrain.getPose()));
    }

    HubUtils.startTimer(DriverStation.getMatchTime());
    // drivetrain.resetPose(AutoalignConstants.Target.TRENCH_LEFT_ALLIANCE.getPose2d().plus(new Transform2d(Units.inchesToMeters(-60), 0.0, Rotation2d.k180deg)));
  }

  @Override
  public void teleopPeriodic() {
    SmartDashboard.putString("Seconds Until Shift Change", String.format("%.2f", HubUtils.secondsUntilShiftChange(SharedData.kAllianceColor)));
    SmartDashboard.putBoolean("Is Hub Active", HubUtils.isAllianceHubActive(SharedData.kAllianceColor));
    SmartDashboard.putNumber("Time remaining", 140 - HubUtils.getCurrentTime());

    for (CameraSettings camera : VisionConstants.kCameras) {
      SmartDashboard.putBoolean("is" + camera.getCameraName() + "Enabled", camera.isEnabled());
    }

    SmartDashboard.putNumber("RobotAngle", swerveUtil.getPose().getRotation().getDegrees());
    SmartDashboard.putBoolean("Flywheel At setpoint", shooterSuperstructure.areAllFlywheelsAtVelocity());
  }

  @Override
  public void teleopExit() {
  }

  @Override
  public void testInit() {
    CommandScheduler.getInstance().cancelAll();
  }

  @Override
  public void testPeriodic() {
  }

  @Override
  public void testExit() {
  }

  public void simulationInit() {
    drivetrain.resetPose(drivetrain.getPose());
  }

  @Override
  public void simulationPeriodic() {
    SmartDashboard.putData(drivetrain.getPigeon2());

    vision.simulationPeriodic(drivetrain.getPose());

  }
}