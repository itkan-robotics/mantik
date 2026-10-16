// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.*;
import static frc.robot.Bindings.configureBindings;
import static frc.robot.state.Abomination.getScoreMode;

import com.ctre.phoenix6.swerve.SwerveModule.DriveRequestType;
import com.ctre.phoenix6.swerve.SwerveRequest;
import dev.doglog.DogLog;
import edu.wpi.first.math.geometry.Translation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.networktables.BooleanSubscriber;
import edu.wpi.first.networktables.DoubleSubscriber;
import edu.wpi.first.units.measure.*;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.PowerDistribution;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.shuffleboard.Shuffleboard;
import edu.wpi.first.wpilibj.shuffleboard.ShuffleboardTab;
import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.SequentialCommandGroup;
import edu.wpi.first.wpilibj2.command.WrapperCommand;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.autos.*;
import frc.robot.state.Abomination;
import frc.robot.state.StateVariables;
import frc.robot.state.logic.actions.DesiredAction;
import frc.robot.state.logic.constants.PassMode;
import frc.robot.state.logic.constants.PointConstant;
import frc.robot.state.logic.constants.ScoreMode;
import frc.robot.subsystems.*;
import frc.robot.subsystems.base.Structure;
import frc.robot.subsystems.constants.Constants;
import frc.robot.subsystems.constants.TunerConstants;
import frc.robot.utils.HubActivity;
import frc.robot.utils.InstCmd;
import frc.robot.utils.localization.FieldZones;
import frc.robot.utils.localization.LocalizationState;
import frc.robot.utils.shotparams.ShotParameters;

public class RobotContainer {

  public static final boolean DEBUG = false;
  public static final boolean CAMP_MODE = false;

  public static final LinearVelocity MAX_SPEED = TunerConstants.kSpeedAt12Volts;
  public static final AngularVelocity MAX_ANGULAR_RATE = RotationsPerSecond.of(1.15);
  public static SendableChooser<Command> AUTO_CHOOSER;
  private static SendableChooser<PassMode> passChooser;
  public static final SwerveRequest.FieldCentric DRIVE =
      new SwerveRequest.FieldCentric()
          .withDeadband(MAX_SPEED.in(MetersPerSecond) * 0.1)
          .withRotationalDeadband(MAX_ANGULAR_RATE.in(RotationsPerSecond) * 0.1)
          .withDriveRequestType(DriveRequestType.OpenLoopVoltage);
  public static final SwerveRequest.FieldCentricFacingAngle DRIVE_FACING =
      new SwerveRequest.FieldCentricFacingAngle()
          .withDeadband(MAX_SPEED.in(MetersPerSecond) * 0.1)
          .withRotationalDeadband(MAX_ANGULAR_RATE.in(RotationsPerSecond) * 0.1)
          .withDriveRequestType(DriveRequestType.OpenLoopVoltage);

  public static final SwerveRequest.PointWheelsAt POINT = new SwerveRequest.PointWheelsAt();

  public static final CommandXboxController JOYSTICK = new CommandXboxController(0);
  public static final CommandXboxController CODRIVER_JOYSTICK = new CommandXboxController(1);

  public static final PowerDistribution PDH =
      new PowerDistribution(1, PowerDistribution.ModuleType.kRev);

  public static final double ROBOT_LOOP_TIME = 0.02;

  //  public static final DigitalInput MSTOP = new DigitalInput(9);

  public static final Drivetrain DRIVETRAIN = TunerConstants.createDrivetrain();
  public static final Vision VISION = new Vision();
  public static final Turret TURRET = new Turret();
  public static final Shooter SHOOTER = new Shooter();
  public static final Intake INTAKE = new Intake();
  public static final Hopper HOPPER = new Hopper();
  public static final Lights LIGHTS = new Lights();

  public static final Structure STRUCTURE = new Structure();

  public static final WrapperCommand systemCheckCommand =
      new SequentialCommandGroup(
              new InstCmd(() -> Abomination.setAction(DesiredAction.DEFEND)),
              new TurretCheckCommand(),
              new HoodCheckCommand(),
              new ZeroIntake().andThen(new IntakeCheckCommand()),
              new VelocitySystemCheckCommand(
                  "INTAKE",
                  INTAKE::testRollers,
                  3.0,
                  INTAKE.ROLLER_L::getSupplyCurrentAmps,
                  INTAKE.ROLLER_L::getVelocityRPS,
                  5.5,
                  46.0,
                  () -> {
                    INTAKE.stopRollers();
                    INTAKE.retract();
                  }),
              new VelocitySystemCheckCommand(
                  "SHOOTER",
                  () -> SHOOTER.setVelocity(50, 0),
                  3.0,
                  SHOOTER.FLYWHEEL_1::getSupplyCurrentAmps,
                  SHOOTER.FLYWHEEL_1::getVelocityRPS,
                  1.75,
                  50.0,
                  SHOOTER::stopFlywheel),
              new VelocitySystemCheckCommand(
                  "BACKSPIN",
                  () -> SHOOTER.setVelocity(50.0, 1.0),
                  3.0,
                  SHOOTER.BACKSPIN::getSupplyCurrentAmps,
                  SHOOTER.BACKSPIN::getVelocityRPS,
                  6.5,
                  50.0,
                  SHOOTER::stopFlywheel),
              new VelocitySystemCheckCommand(
                  "ROTOR_SPIN",
                  () -> HOPPER.setHookVelocityRPS(2.0),
                  3.0,
                  HOPPER.ROTOR_HOOK::getSupplyCurrentAmps,
                  HOPPER.ROTOR_HOOK::getVelocityRPS,
                  8.0,
                  1.9,
                  HOPPER::stopRollers),
              new VelocitySystemCheckCommand(
                  "ROTOR_PUSH",
                  () -> HOPPER.setPushVoltage(12.0),
                  3.0,
                  HOPPER.ROTOR_PUSH::getSupplyCurrentAmps,
                  HOPPER.ROTOR_PUSH::getVelocityRPS,
                  18.5,
                  75.0,
                  HOPPER::stopRollers))
          .ignoringDisable(false);
  public static final DoubleSubscriber hoodAngleDeg =
      DogLog.tunable("Testing/HoodAngleDeg", Degrees.of(5));
  public static final DoubleSubscriber shooterRPS =
      DogLog.tunable("Testing/ShooterRPS", RotationsPerSecond.of(0.0));
  public static final DoubleSubscriber backspinRatio =
      DogLog.tunable("Testing/BackspinRatioDeg", 1.0);
  public static final BooleanSubscriber isManualShooter =
      DogLog.tunable("Testing/IsManualShooter", false);

  public static final DoubleSubscriber manualTurretOverride =
      DogLog.tunable(
          "Comp/TurretOverrideDegrees", 0.0, (d) -> StateVariables.TURRET_DEGREE_OFFSET = d);

  public static final DoubleSubscriber manualVelocityOverride =
      DogLog.tunable(
          "Comp/VelocityOverrideRPS", 1.25, (d) -> StateVariables.SHOOTER_VELOCITY_OVERRIDE = d);

  public static final DoubleSubscriber hookRpsOverride =
      DogLog.tunable("Comp/HookRPS", 1.8125, (d) -> Constants.HopperConstants.HOOK_RPS = d);

  public static final BooleanSubscriber didBlueWinAuto =
      DogLog.tunable("SmartDashboard/BlueWonAuto", false, HubActivity::blueWonAuto);

  //  public static final BooleanSubscriber killTheIntake =
  //      DogLog.tunable("SmartDashboard/KillIntake", true, StateVariables::setIntakeDisable);

  public static final BooleanSubscriber fanOverride =
      DogLog.tunable("SmartDashboard/FanOverride", false, StateVariables::setFanOverride);

  public static final BooleanSubscriber throttleOverride =
      DogLog.tunable("SmartDashboard/throttleOverride", true, VISION::setThrottle);

  private static final LocalizationState LOCALIZATION_STATE =
      new LocalizationState(
          new Translation2d(), FieldZones.Zone.ALLIANCE_SIDE, PointConstant.SCORE_HUB);

  private static final LocalizationState LOCALIZATION_LOOKAHEAD =
      new LocalizationState(
          new Translation2d(), FieldZones.Zone.ALLIANCE_SIDE, PointConstant.SCORE_HUB);

  private static ShotParameters SHOT_PARAMETERS = new ShotParameters(0.0, 0.0, 0.0, 0.0, false);

  private static final double LOG_THINGS_PERIOD_SEC = 0.1;
  private static double lastLogThingsTimestampSec = Double.NEGATIVE_INFINITY;

  public static LocalizationState getLocalizationState() {
    return LOCALIZATION_STATE;
  }

  public static LocalizationState getLookaheadState() {
    return LOCALIZATION_LOOKAHEAD;
  }

  public static ShotParameters getShotParameters() {
    return SHOT_PARAMETERS;
  }

  public RobotContainer() {
    configureSubsystems();
    configureAutos();
    configureBindings();
    configurePassing();
    configureLogging();
  }

  public void configureSubsystems() {
    STRUCTURE.registerSubsystems(HOPPER, SHOOTER, INTAKE, TURRET);
    DRIVETRAIN.registerTelemetry(DRIVETRAIN.LOGGER::telemeterize);
    DRIVETRAIN.initStatusSignals();
  }

  public void configureLogging() {
    ShuffleboardTab tab = Shuffleboard.getTab("HUB");

    tab.addDouble("DriverHelp/MatchTime", DriverStation::getMatchTime);
    tab.addBoolean("DriverHelp/IsActive", HubActivity::isActive);
    tab.addBoolean("DriverHelp/IsNext", HubActivity::isActiveNext);
    tab.addDouble(
        "DriverHelp/TimeUntilNextActiveChange",
        () -> Math.round(HubActivity.timeUntilNextActiveChange() * 10.0) / 10.0);
    tab.addString("DriverHelp/HelpWhatDoIDo", HubActivity::helpWhatDoIDo);
  }

  public void configureAutos() {
    Autos.registerEventTriggers();
    Autos.buildAutos();
    // Set up auto routines
    AUTO_CHOOSER = new SendableChooser<>();
    AUTO_CHOOSER.addOption("SystemCheck", systemCheckCommand);
    AUTO_CHOOSER.addOption("OutpostBump", Autos.OUTPOST_BUMP);
    AUTO_CHOOSER.addOption("DepotBump", Autos.DEPOT_BUMP);
    AUTO_CHOOSER.addOption("Outpost", Autos.OUTPOST);
    AUTO_CHOOSER.addOption("Depot", Autos.DEPOT);
    AUTO_CHOOSER.addOption("Middle", Autos.MIDDLE);

    AUTO_CHOOSER.onChange((cmd) -> Robot.AUTONOMOUS_COMMAND = cmd);
    SmartDashboard.putData("Auto Chooser", AUTO_CHOOSER);
  }

  public void configurePassing() {
    passChooser = new SendableChooser<>();
    for (PassMode mode : PassMode.values()) {
      passChooser.addOption(mode.name(), mode);
    }
    passChooser.setDefaultOption(PassMode.NEUTRAL.name(), PassMode.NEUTRAL);
    passChooser.onChange(Abomination::setPassMode);
    SmartDashboard.putData("Pass Chooser", passChooser);
  }

  public static void updateLocalizationState(final Alliance alliance) {
    final Translation2d robotTranslation = DRIVETRAIN.getPose().getTranslation();
    final FieldZones.Zone zone = FieldZones.getZoneFromTranslation(alliance, robotTranslation);
    LOCALIZATION_STATE.update(robotTranslation, zone);
    ChassisSpeeds robotSpeed = DRIVETRAIN.getFieldRelativeSpeeds();
    Translation2d futurePos =
        robotTranslation.plus(
            new Translation2d(robotSpeed.vxMetersPerSecond, robotSpeed.vyMetersPerSecond)
                .times(0.65));
    final FieldZones.Zone futureZone = FieldZones.getZoneFromTranslation(alliance, futurePos);
    LOCALIZATION_LOOKAHEAD.update(futurePos, futureZone);
  }

  public static void updateShotParameters(final Alliance alliance) {
    //    if (isManualShooter.get()) {
    //      ShotParameters realParams =
    //          SHOT_PARAMETERS =
    //              getScoreMode()
    //                  .getScorePoint(getLocalizationState(), alliance)
    //                  .getAllianceShotParams();
    //      SHOT_PARAMETERS =
    //          new ShotParameters(
    //              realParams.turretAngleTargetDeg(),
    //              hoodAngleDeg.get(),
    //              shooterRPS.get(),
    //              backspinRatio.get(),
    //              true);
    //    } else {
    SHOT_PARAMETERS =
        getScoreMode().getScorePoint(getLocalizationState(), alliance).getAllianceShotParams();
  }

  //  }

  public static void logThings(final Alliance alliance) {
    double nowSec = Timer.getFPGATimestamp();
    if (nowSec - lastLogThingsTimestampSec < LOG_THINGS_PERIOD_SEC) {
      return;
    }
    lastLogThingsTimestampSec = nowSec;

    LocalizationState state = getLocalizationState();
    LocalizationState futureState = getLookaheadState();
    ShotParameters params = getShotParameters();
    ScoreMode mode = getScoreMode();

    DogLog.log("ShotCalculator/TurretAngleRot", params.turretAngleTargetDeg() / 360.0);
    DogLog.log("ShotCalculator/TurretAngleDeg", params.turretAngleTargetDeg());
    DogLog.log("ShotCalculator/HoodAngleRot", params.hoodAngleDeg() / 360.0);
    DogLog.log("ShotCalculator/HoodAngleDeg", params.hoodAngleDeg());
    DogLog.log("ShotCalculator/FlywheelRPS", params.flywheelVelocityRps());
    DogLog.log("ShotCalculator/BackspinRatio", params.backspinRatio());
    DogLog.log("ShotCalculator/IsValidShot", params.isValid());

    DogLog.log("A_Turret/TURRET_ROTATE/isAtTarget", TURRET.isTurretAtTarget());
    DogLog.log("A_Turret/HOOD_ANGLE/isAtTarget", TURRET.isHoodAtTarget());
    DogLog.log(
        "ShotCalculator/ShouldShoot",
        params.isValid() && TURRET.isTurretAtTarget() && TURRET.isHoodAtTarget());

    DogLog.log("A_Hopper/HOPPER_PUSH/isJammed", HOPPER.isPusherJammed());
    DogLog.log("A_Hopper/HOPPER_PUSH/isFreeSpin", HOPPER.isPusherFreeSpinning());

    DogLog.log(
        "ShotCalculator/DistanceToTarget",
        mode.getScorePoint(state, alliance).getAllianceDistance().in(Meters));

    DogLog.log("Abomination/RobotState", Abomination.getPreviousState().name());
    DogLog.log("Abomination/ScoreMode", mode.name());
    DogLog.log("Abomination/ScorePoint", mode.getScorePoint(state, alliance).name());
    DogLog.log("Abomination/FieldZone", state.fieldZone().name());
    DogLog.log("Abomination/FutureZone", futureState.fieldZone().name());
    DogLog.log("Abomination/FutureTranslation", futureState.robotTranslation());
    DogLog.log("Abomination/DesiredAction", Abomination.getAction().name());

    DogLog.log("StateVariables/HoodDodgeOverride", StateVariables.getHoodDodgeOverride());
    DogLog.log("StateVariables/IntakeDodge", StateVariables.getIntakeDodge());
    DogLog.log("StateVariables/IsMoving", DRIVETRAIN.isMoving());
    DogLog.log("StateVariables/IsTilted", DRIVETRAIN.isTilted());
  }

  //  public static Command getAutonomousCommand() {
  //    return autoChooser.getSelected();
  //  }
}
