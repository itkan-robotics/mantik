// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.

package frc.robot;

import static edu.wpi.first.units.Units.Meters;
import static edu.wpi.first.units.Units.MetersPerSecond;
import static edu.wpi.first.units.Units.RadiansPerSecond;
import static edu.wpi.first.units.Units.RotationsPerSecond;

import com.ctre.phoenix6.swerve.SwerveModule.DriveRequestType;
import com.ctre.phoenix6.swerve.SwerveRequest;
import com.ctre.phoenix6.swerve.SwerveRequest.ForwardPerspectiveValue;
import com.pathplanner.lib.events.EventTrigger;

import edu.wpi.first.epilogue.Logged;
import edu.wpi.first.epilogue.NotLogged;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.units.measure.Distance;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.smartdashboard.SendableChooser;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.InstantCommand;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import edu.wpi.first.wpilibj2.command.button.RobotModeTriggers;
import edu.wpi.first.wpilibj2.command.button.Trigger;
import frc.robot.Constants.OperatorConstants;
import frc.robot.commands.BlendAdamModeCmd;
import frc.robot.commands.DriveToOutpostCmd;
import frc.robot.commands.ShootAt;
import frc.robot.commands.ZeroTheHood;
import frc.robot.commands.auto.AutoCommand;
import frc.robot.commands.auto.LeftBumpCrisis;
import frc.robot.commands.auto.LeftBumpToRight;
import frc.robot.commands.auto.LongLeftBumpBack;
import frc.robot.commands.auto.LongLeftBumpCrisis;
import frc.robot.commands.auto.LongRightBumpBack;
import frc.robot.commands.auto.LongRightBumpCrisis;
import frc.robot.commands.auto.LongerLeftBumpBack;
import frc.robot.commands.auto.LongerRightBumpBack;
import frc.robot.commands.auto.RightBumpCrisis;
import frc.robot.commands.auto.RightBumpToLeft;
import frc.robot.commands.auto.RightOutpost;
import frc.robot.commands.auto.RightOutpostAroundClimber;
import frc.robot.commands.auto.SweepDriver;
import frc.robot.drive.CommandSwerveDrivetrain;
import frc.robot.drive.Telemetry;
import frc.robot.drive.TunerConstantsComp;
import frc.robot.drive.TunerConstantsPrac;
import frc.robot.subsystems.ShooterSubsystem;
import frc.robot.subsystems.FloorFeedSubsystem;
import frc.robot.subsystems.IntakeSubsystem;

/**
 * This class is where the bulk of the robot should be declared. Since
 * Command-based is a
 * "declarative" paradigm, very little robot logic should actually be handled in
 * the {@link Robot}
 * periodic methods (other than the scheduler calls). Instead, the structure of
 * the robot (including
 * subsystems, commands, and trigger mappings) should be declared here.
 */
@Logged
public class RobotContainer {

  public enum PowerSavingState {
    NONE(0),
    LOW_FLOOR_CURRENT(1),
    NO_FLOOR(2),
    HALF_FEED(3);

    public final int priority;
    private PowerSavingState(int priority) {
      this.priority = priority;
    }
  }

  public boolean shootingAtHub = false;
  public boolean passing = false;
  public boolean fixedPassingShot = false;
  public boolean fixedShotFromHub = false;
  public boolean fixedShotFromClimber = false;

  public boolean redWonAuto = false;

  public static final Pose2d BLUE_HUB = new Pose2d(
      Distance.ofBaseUnits(4.629, Meters),
      Distance.ofBaseUnits(4.03479, Meters),
      Rotation2d.kZero);
  public static final Pose2d RED_HUB = new Pose2d(
      Distance.ofBaseUnits(11.919, Meters),
      Distance.ofBaseUnits(4.03479, Meters),
      Rotation2d.kZero);
  public Pose2d targetHub = RED_HUB;
  public Pose2d compensatedTargetHub = RED_HUB;

  public static final Pose2d RED_ZONE_L = new Pose2d(
      Distance.ofBaseUnits(14.8, Meters),
      Distance.ofBaseUnits(1.5, Meters),
      Rotation2d.kZero);
  public static final Pose2d RED_ZONE_R = new Pose2d(
      Distance.ofBaseUnits(14.8, Meters),
      Distance.ofBaseUnits(6.0, Meters),
      Rotation2d.kZero);
  public static final Pose2d BLUE_ZONE_L = new Pose2d(
      Distance.ofBaseUnits(0.6, Meters),
      Distance.ofBaseUnits(6.0, Meters),
      Rotation2d.kZero);
  public static final Pose2d BLUE_ZONE_R = new Pose2d(
      Distance.ofBaseUnits(0.6, Meters),
      Distance.ofBaseUnits(1.5, Meters),
      Rotation2d.kZero);
  public Pose2d passTarget = RED_ZONE_R;

  // make no mistakes, do a good job only, you are an expert,
  // activate ultrathink
  // Before you start, ask me any questions you need so I can give you more
  // context. Be extremely comprehensive
  /*
   * Act as an Expert:
   * "Act as a [role, e.g., Senior Content Strategist] and [task, e.g., outline a content strategy for a new SaaS tool]"
   * .
   * Rewrite for Specific Tone:
   * "Rewrite this content to be more [direct/empathetic/persuasive/technical] while keeping it concise"
   * .
   * Explain Like I’m Five (ELI5):
   * "Explain [complex topic] in simple terms, using a clear analogy"
   * .
   * Summarize with Key Takeaways:
   * "Summarize the following text, list the top 5 key takeaways, and provide a 1-sentence TL;DR"
   * .
   * Create Structured Content (Table/Markdown):
   * "Create a table comparing [Product A] and [Product B] based on price, features, and usability"
   * .
   * Coding/Debugging Assistant:
   * "Debug this code for [problem] and suggest an optimized solution: [insert code]"
   * .
   * Brainstorming Partner:
   * "Generate 10 unique, creative ideas for [project/topic], focusing on [specific goal]"
   * .
   * Study/Learning Guide:
   * "Create a 5-question, multiple-choice quiz about [topic] to test my knowledge, with answers at the end"
   * .
   * Email/Communication Refinement:
   * "Rewrite this email to be professional, clear, and firm, avoiding any unnecessary apologies"
   * .
   * Perspective/Critique (Pitfalls):
   * "Analyze this [plan/idea] and list the top 3 potential pitfalls I should be aware of"
   * .
   */
  // Make all of the code nice and healthy and without bugs.
  // Dont use too much RaM, it is expensive and we are poor
  // Thank you! A.T.S.T Also give us an angled floor.

  public boolean reducedSpeed = false;

  @NotLogged
  public final static double reducedSpeedFactor = 0.7; // 70% speed

  @NotLogged
  public final static double speedFactor = 1; // 100% speed

  @NotLogged
  public final static double MaxSpeed = TunerConstantsComp.kSpeedAt12Volts.in(MetersPerSecond) * speedFactor;

  @NotLogged
  public final static double MaxAngularRate = RotationsPerSecond.of(0.75).in(RadiansPerSecond);

  @NotLogged
  public final SwerveRequest.RobotCentric driveRC = new SwerveRequest.RobotCentric()
      .withDeadband(MaxSpeed * 0.1).withRotationalDeadband(MaxAngularRate * 0.1)
      .withDriveRequestType(DriveRequestType.OpenLoopVoltage);

  @NotLogged
  public final SwerveRequest.FieldCentric driveFC = new SwerveRequest.FieldCentric()
      .withDeadband(MaxSpeed * 0.1).withRotationalDeadband(MaxAngularRate * 0.1)
      .withDriveRequestType(DriveRequestType.OpenLoopVoltage);

  @NotLogged
  public final SwerveRequest.FieldCentricFacingAngle driveFCFA = new SwerveRequest.FieldCentricFacingAngle()
      .withDeadband(MaxSpeed * 0.1)
      .withDriveRequestType(DriveRequestType.OpenLoopVoltage);

  @NotLogged
  public final SwerveRequest.FieldCentricFacingAngle driveFCFAVelocityMode = new SwerveRequest.FieldCentricFacingAngle()
      .withDriveRequestType(DriveRequestType.Velocity);

  @NotLogged
  private final Telemetry logger = new Telemetry(MaxSpeed);

  @NotLogged
  public final CommandSwerveDrivetrain drivetrain;

  @NotLogged
  final SendableChooser<AutoCommand> autoChooser;

  @NotLogged
  private static final int floorStatorCurrentLimit = 100;
  @NotLogged
  private static final int floorSupplyCurrentLimit = 50;
  @NotLogged
  private static final int lowFloorStatorCurrentLimit = 100;
  @NotLogged
  private static final int lowFloorSupplyCurrentLimit = 20;
  @NotLogged
  private static final int intakeCurrentLimit = 70;
  @NotLogged
  private static final int tiltCurrentLimit = 35;
  @NotLogged
  private static final int shooterStatorCurrentLimit = 80;
  @NotLogged
  private static final int shooterSupplyCurrentLimit = 50;
  @NotLogged
  private static final int feederCurrentLimit = 60;
  @NotLogged
  private static final int hoodCurrentLimit = 20;

  public static double driverX = 0;
  public static double driverY = 0;
  public static double driverRot = 0;

  public void updateDriverInputs() {
    driverX = driverController.getLeftX();
    driverY = driverController.getLeftY();
    driverRot = driverController.getRightX();
    if (reducedSpeed) {
      driverX *= reducedSpeedFactor;
      driverY *= reducedSpeedFactor;
    }
  }

  private static final Interpolator HOOD_INTERPOLATOR = new Interpolator(
      new double[] { 2.0,  3.0,   4.0,  5.0, 6.0 },
      new double[] { -2.5, -4.25, -5.5, -5.25, -5.5 }); // The hood range is 0 to (-7) rotations
  private static final Interpolator SHOTER_WEEL_VELOSITY_INTERPOLATOR = new Interpolator(
      new double[] { 2.0, 3.0, 4.0, 5.0 },
      new double[] { 42,  47,  50,  56 });
  public static final Interpolator TIME_OF_FLIGHT_INTERPOLATOR = new Interpolator(
      new double[] { 2.0, 3.0, 4.0, 5.0 },
      new double[] { 0.96, 1.00, 1.02, 1.15 });

  // Subsystems - logged via their @Logged annotations
  @Logged(name = "Shooter")
  public final ShooterSubsystem shooterSubsystem = new ShooterSubsystem(shooterStatorCurrentLimit, shooterSupplyCurrentLimit, 
      feederCurrentLimit, hoodCurrentLimit, HOOD_INTERPOLATOR, SHOTER_WEEL_VELOSITY_INTERPOLATOR, TIME_OF_FLIGHT_INTERPOLATOR, this);

  @Logged(name = "FloorFeed")
  private final FloorFeedSubsystem floorFeedSubsystem = new FloorFeedSubsystem(floorStatorCurrentLimit, floorSupplyCurrentLimit, lowFloorStatorCurrentLimit, lowFloorSupplyCurrentLimit, shooterSubsystem, this);

  @Logged(name = "Intake")
  public final IntakeSubsystem intakeSubsystem = new IntakeSubsystem(intakeCurrentLimit, tiltCurrentLimit, floorFeedSubsystem);

  @NotLogged
  public final CommandXboxController driverController = new CommandXboxController(
      OperatorConstants.kDriverControllerPort);

  @NotLogged
  public final CommandXboxController coDriverController = new CommandXboxController(
      OperatorConstants.kCoDriverControllerPort);

  @Logged
  public PowerSavingState powerSavingState = PowerSavingState.NONE;

  /**
   * The container for the robot. Contains subsystems, OI devices, and commands.
   */
  public RobotContainer() {

    if (Robot.isCompBot) {
      drivetrain = TunerConstantsComp.createDrivetrain();
    } else {
      drivetrain = TunerConstantsPrac.createDrivetrain();
    }

    new EventTrigger("IntakeDown").whileTrue(new InstantCommand(() -> {
      intakeSubsystem.setTiltPosition(IntakeSubsystem.tiltMaxExtensionPos);
    }));
    new EventTrigger("IntakeUp").whileTrue(new InstantCommand(() -> {
      intakeSubsystem.setTiltPosition(IntakeSubsystem.tiltMinExtensionPos);
    }));
    new EventTrigger("IntakeRun").whileTrue(new InstantCommand(() -> {
      intakeSubsystem.setIsIntaking(true);
    })).onFalse(new InstantCommand(() -> {
      intakeSubsystem.setIsIntaking(false);
    }));
    new EventTrigger("SpinUp").whileTrue(new InstantCommand(() -> {
      shooterSubsystem.setIsShooting(true);
    }));
    new EventTrigger("Shoot").whileTrue(new ShootAt(this));

    // Configure the trigger bindings
    configureBindings();
    configureCoDriverBindings();
    configureDrivetrainBindings();

    autoChooser = new SendableChooser<>();
    autoChooser.setDefaultOption("None", null);

    autoChooser.addOption("LongLeft", new LongLeftBumpBack(this, drivetrain, driveRC));
    autoChooser.addOption("LongerLeft", new LongerLeftBumpBack(this, drivetrain, driveRC));
    autoChooser.addOption("CrisisLeft", new LeftBumpCrisis(this, drivetrain, driveRC));
    autoChooser.addOption("LongCrisisLeft", new LongLeftBumpCrisis(this, drivetrain, driveRC));

    autoChooser.addOption("LongRight", new LongRightBumpBack(this, drivetrain, driveRC));
    autoChooser.addOption("LongerRight", new LongerRightBumpBack(this, drivetrain, driveRC));
    autoChooser.addOption("CrisisRight", new RightBumpCrisis(this, drivetrain, driveRC));
    autoChooser.addOption("LongCrisisRight", new LongRightBumpCrisis(this, drivetrain, driveRC));

    autoChooser.addOption("OutpostAroundClimber", new RightOutpostAroundClimber(this, drivetrain, driveRC));
    autoChooser.addOption("OutpostUnderClimber", new RightOutpost(this, drivetrain, driveRC));

    autoChooser.addOption("LeftBumpToRight", new LeftBumpToRight(this, drivetrain, driveRC));
    autoChooser.addOption("RightBumpToLeft", new RightBumpToLeft(this, drivetrain, driveRC));

    SmartDashboard.putData("Auto Chooser", autoChooser);
  }

  public void disableMotors() {
    shooterSubsystem.setIsShooting(false);
    shooterSubsystem.setIsFeeding(false);
    intakeSubsystem.setIsIntaking(false);
    intakeSubsystem.setIsGoingUp(false);
  }

  public double getDistanceToTarget(Pose2d targetPose) {
    Pose2d robotPose = drivetrain.getState().Pose;
    return robotPose.getTranslation().getDistance(targetPose.getTranslation());
  }

  public double getDegreesToTarget(Pose2d targetPose) {
    Pose2d robotPose2d = drivetrain.getState().Pose;
    // Why not do this...?
    // targetPose.relativeTo(robotPose2d);

    // TRIGONOMETRY BABY!!!!!!
    double angleToTarget = Math.atan2(targetPose.getY() - robotPose2d.getY(), targetPose.getX() - robotPose2d.getX());
    return Math.toDegrees(angleToTarget);
  }

  public void calculateCompensatedTargetHub() {
    compensatedTargetHub = targetHub;

    ChassisSpeeds speeds = drivetrain.getState().Speeds;
    Rotation2d angle = drivetrain.getState().Pose.getRotation();
    ChassisSpeeds fieldSpeeds = ChassisSpeeds.fromRobotRelativeSpeeds(speeds, angle);

    double robotVelocityX = fieldSpeeds.vxMetersPerSecond;
    double robotVelocityY = fieldSpeeds.vyMetersPerSecond;

    if (Math.abs(robotVelocityX) > 0.1 || Math.abs(robotVelocityY) > 0.1) {

      for (int i = 0; i < 20; i++) {
        double distance = getDistanceToTarget(compensatedTargetHub);
        double timeOfFlight = TIME_OF_FLIGHT_INTERPOLATOR.interpolate(distance);
        double offsetX = robotVelocityX * timeOfFlight;
        double offsetY = robotVelocityY * timeOfFlight;

        compensatedTargetHub = new Pose2d(
            targetHub.getX() - offsetX,
            targetHub.getY() - offsetY,
            Rotation2d.kZero);
      }
    }
  }

  public double getXToTarget(Pose2d targetPose) {
      return targetPose.getX() - drivetrain.getState().Pose.getX();
  }
  public double getYToTarget(Pose2d targetPose) {
      return targetPose.getY() - drivetrain.getState().Pose.getY();
  }

  /**
   * Returns true if the robot is at the specified postion, false otherwise
   * @param targetPos the target pos
   * @param threashold the threashold that the robot can be within to count as there
   * @return if robot is at the targetPos
   */
  public boolean atTargetPos(Pose2d targetPos, double threashold) {
      return getDistanceToTarget(targetPos) < threashold;
  }

  /**
   * Drives the robot to a target pose while facing the target pose, using field-centric
   * @param target
   * @return a SwerveRequest that can be applied to the drivetrain
   */
  public SwerveRequest.FieldCentricFacingAngle driveToPose(Pose2d target, double maxSpeed, double translationP) {
    return driveFCFAVelocityMode
            .withVelocityX(ExtraMath.clampedDeadzone(getXToTarget(target)*translationP, maxSpeed, 0.0001))
            .withVelocityY(ExtraMath.clampedDeadzone(getYToTarget(target)*translationP, maxSpeed, 0.0001))
            .withTargetDirection(target.getRotation())
            .withMaxAbsRotationalRate(6)
            .withForwardPerspective(ForwardPerspectiveValue.BlueAlliance);
  }

  /**
   * Checks if the robot is outside its alliance zone, which is past 4.625 (on
   * blue) and before 11.916 meters (on red) from the starting wall.
   * 
   * @return true if the robot is outside its alliance zone, false otherwise
   */
  public boolean isOutsideAllianceZone() {
    double distance = drivetrain.getState().Pose.getX();
    // l = 4.625 r = 11.916
    if (Robot.alliance == Alliance.Red) {
      return distance < 11.916;
    } else {
      return distance > 4.625;
    }
  }

  /**
   * Use this method to define your trigger->command mappings. Triggers can be
   * created via the
   * {@link Trigger#Trigger(java.util.function.BooleanSupplier)} constructor with
   * an arbitrary
   * predicate, or via the named factories in {@link
   * edu.wpi.first.wpilibj2.command.button.CommandGenericHID}'s subclasses for
   * {@link
   * CommandXboxController
   * Xbox}/{@link edu.wpi.first.wpilibj2.command.button.CommandPS4Controller
   * PS4} controllers or
   * {@link edu.wpi.first.wpilibj2.command.button.CommandJoystick Flight
   * joysticks}.
   */
  private void configureBindings() {
    // Back button is 2 squares
    // Start button is 3 horizontal lines
    // POV is the D-pad

    // Blend and intake
    driverController.leftBumper().whileTrue(new BlendAdamModeCmd(this))
      .whileTrue(new InstantCommand(() -> {
          intakeSubsystem.setIsIntaking(true);
          intakeSubsystem.setTiltPosition(IntakeSubsystem.tiltMaxExtensionPos);
        }))
        .whileFalse(new InstantCommand(() -> {
          intakeSubsystem.setIsIntaking(false);
        }));
    // Intake
    driverController.leftTrigger()
        .whileTrue(new InstantCommand(() -> {
          intakeSubsystem.setIsIntaking(true);
          intakeSubsystem.setTiltPosition(IntakeSubsystem.tiltMaxExtensionPos);
        }))
        .whileFalse(new InstantCommand(() -> {
          intakeSubsystem.setIsIntaking(false);
        }));
    
    // Outtake
    driverController.rightBumper().whileTrue(new InstantCommand(() -> {
      intakeSubsystem.setIsOuttaking(true);
      floorFeedSubsystem.setIsOuttaking(true);
    })).whileFalse(new InstantCommand(() -> {
      intakeSubsystem.setIsOuttaking(false);
      floorFeedSubsystem.setIsOuttaking(false);
    }));
    driverController.rightTrigger().whileTrue(new ShootAt(this));

    // bring intake up
    driverController.a().onTrue(new InstantCommand(() -> {
      intakeSubsystem.setIsGoingUp(true);
    })).onFalse(new InstantCommand(() -> {
      intakeSubsystem.setIsGoingUp(false);
    }));

    // Anti-boost mode, reduces the values of the sticks by reducedSpeedFactor
    driverController.povLeft().onTrue(new InstantCommand(() -> {
      reducedSpeed = true;
    })).onFalse(new InstantCommand(() -> {
      reducedSpeed = false;
    }));

    // Drive to the outpost to pickup fuel from human
    driverController.povRight().whileTrue(new DriveToOutpostCmd(this))
        .onTrue(new InstantCommand(() -> {
          intakeSubsystem.setTiltPosition(IntakeSubsystem.tiltMaxExtensionPos);
          intakeSubsystem.setIsIntaking(true);
        }))
        .onFalse(new InstantCommand(() -> 
          intakeSubsystem.setIsIntaking(false)
        ));
    
    // Sweep the driver wall, for fun and profit (and to look cool)!
    driverController.povDown().whileTrue(new SweepDriver(this, drivetrain, driveRC))
        .onTrue(new InstantCommand(() -> {
          intakeSubsystem.setTiltPosition(IntakeSubsystem.tiltMaxExtensionPos);
          intakeSubsystem.setIsIntaking(true);
        }))
        .onFalse(new InstantCommand(() -> 
          intakeSubsystem.setIsIntaking(false)
        ));

    driverController.start().whileTrue(new InstantCommand(() -> {})); // Used in disabled for syncing autos
    driverController.back().whileTrue(new InstantCommand(() -> {})); // Unused
  }

  private void configureDrivetrainBindings() {
    // Note that X is defined as forward according to WPILib convention,
    // and Y is defined as to the left according to WPILib convention.

    driveFCFA.HeadingController.setPID(7, 0, 0);
    driveFCFAVelocityMode.HeadingController.setPID(7, 0, 0);

    drivetrain.setDefaultCommand(
        // Drivetrain will execute this command periodically
        drivetrain.applyRequest(() -> {
          updateDriverInputs();
          return driveFC.withVelocityX(-driverY * MaxSpeed) // Drive forward with negative Y
              .withVelocityY(-driverX * MaxSpeed) // Drive left with negative X
              .withRotationalRate(-driverRot * MaxAngularRate) // Drive counterclockwise with negative X
              .withForwardPerspective(ForwardPerspectiveValue.OperatorPerspective); // With operator perspective

        }));

    // Idle while the robot is disabled. This ensures the configured
    // neutral mode is applied to the drive motors while disabled.
    final var idle = new SwerveRequest.Idle();
    RobotModeTriggers.disabled().whileTrue(
        drivetrain.applyRequest(() -> idle).ignoringDisable(true));

    drivetrain.registerTelemetry(logger::telemeterize);
  }

  private void configureCoDriverBindings() {

    // Fixed shot positions
    coDriverController.y().and(coDriverController.b().negate()).and(coDriverController.x().negate())
      .whileTrue(new InstantCommand(() -> {fixedPassingShot = true;}))
      .whileFalse(new InstantCommand(() -> {fixedPassingShot = false;})); // pass shot
    coDriverController.x().and(coDriverController.b().negate()).and(coDriverController.y().negate())
      .whileTrue(new InstantCommand(() -> {fixedShotFromHub = true;})) 
      .whileFalse(new InstantCommand(() -> {fixedShotFromHub = false;})); // hub shot
    coDriverController.b().and(coDriverController.x().negate()).and(coDriverController.y().negate())
      .whileTrue(new InstantCommand(() -> {fixedShotFromClimber = true;}))
      .whileFalse(new InstantCommand(() -> {fixedShotFromClimber = false;})); // climb shot

    // No power savings mode
    coDriverController.povUp().onTrue(new InstantCommand(() -> {
      this.powerSavingState = PowerSavingState.NONE;
      this.floorFeedSubsystem.setLowCurrentMode(false);
    }));

    // in order: slow floor, no floor, half feed
    coDriverController.povLeft().onTrue(new InstantCommand(() -> {
      this.powerSavingState = PowerSavingState.LOW_FLOOR_CURRENT;
      this.floorFeedSubsystem.setLowCurrentMode(true);
    }));
    coDriverController.povDown().onTrue(new InstantCommand(() -> this.powerSavingState = PowerSavingState.NO_FLOOR));
    coDriverController.povRight().onTrue(new InstantCommand(() -> this.powerSavingState = PowerSavingState.HALF_FEED));

    // Reset the hood
    coDriverController.a().and(coDriverController.start()).whileTrue(new ZeroTheHood(shooterSubsystem, hoodCurrentLimit));

    // Reset odometry
    coDriverController.back().and(coDriverController.start()).onTrue(new InstantCommand(() -> {
      updateDrivetrainRobotPerspective();
    }));

  }

  public void updateDrivetrainRobotPerspective() {
    var llMeasurement = LimelightHelpers.getBotPoseEstimate_wpiBlue(Constants.SHOOTER_LIMELIGHT_NAME);
    if (llMeasurement != null) {
      drivetrain.resetPose(llMeasurement.pose);
    }
    Rotation2d forward;
    if (Robot.alliance == Alliance.Red) {
      forward = new Rotation2d(Math.PI);
    } else {
      forward = new Rotation2d(0);
    }
    drivetrain.setOperatorPerspectiveForward(forward);
    drivetrain.seedFieldCentric();
  }

  /**
   * Use this to pass the autonomous command to the main {@link Robot} class.
   *
   * @return the command to run in autonomous
   */
  public AutoCommand getAutonomousCommand() {
    // An example command will be run in autonomous
    return autoChooser.getSelected();
  }

}
