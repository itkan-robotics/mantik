package frc.robot;

import com.ctre.phoenix6.SignalLogger;
import com.ctre.phoenix6.Utils;
import com.ctre.phoenix6.configs.CANdleConfiguration;
import com.ctre.phoenix6.controls.SolidColor;
import com.ctre.phoenix6.controls.StrobeAnimation;
import com.ctre.phoenix6.hardware.CANdle;
import com.ctre.phoenix6.signals.RGBWColor;
import com.ctre.phoenix6.signals.StripTypeValue;
import com.ctre.phoenix6.signals.VBatOutputModeValue;
import com.pathplanner.lib.config.RobotConfig;
import com.pathplanner.lib.path.PathPlannerPath;
import com.pathplanner.lib.trajectory.PathPlannerTrajectory;

import edu.wpi.first.hal.AllianceStationID;
import edu.wpi.first.math.VecBuilder;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Pose3d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.geometry.Rotation3d;
import edu.wpi.first.math.geometry.Translation3d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.DriverStation.Alliance;
import edu.wpi.first.wpilibj.RobotController;
import edu.wpi.first.wpilibj.simulation.DriverStationSim;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.wpilibj.smartdashboard.SmartDashboard;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import frc.robot.Superstructure.SuperState;
import frc.robot.autonomous.AutonomousSelector;
import frc.robot.constants.Constants;
import frc.robot.constants.TunerConstants;
import frc.robot.electronics.SignalRefreshManager;
import frc.robot.subsystems.Swerve;
import com.ctre.phoenix6.signals.NeutralModeValue;
import frc.robot.subsystems.hood.Hood;
import frc.robot.subsystems.hood.HoodIO;
import frc.robot.subsystems.hood.HoodIOReal;
import frc.robot.subsystems.hood.HoodIOSim;
import frc.robot.subsystems.intake.Intake;
import frc.robot.subsystems.intake.IntakeIO;
import frc.robot.subsystems.intake.IntakeIOReal;
import frc.robot.subsystems.intake.IntakeIOSim;
import frc.robot.subsystems.juicer.Juicer;
import frc.robot.subsystems.juicer.JuicerIO;
import frc.robot.subsystems.juicer.JuicerIODisabled;
import frc.robot.subsystems.juicer.JuicerIOReal;
import frc.robot.subsystems.juicer.JuicerIOSim;
import frc.robot.subsystems.shooter.Shooter;
import frc.robot.subsystems.shooter.ShooterIO;
import frc.robot.subsystems.shooter.ShooterIOReal;
import frc.robot.subsystems.shooter.ShooterIOSim;
import frc.robot.subsystems.treadmill.Treadmill;
import frc.robot.subsystems.treadmill.TreadmillIO;
import frc.robot.subsystems.treadmill.TreadmillIOReal;
import frc.robot.subsystems.treadmill.TreadmillIOSim;
import frc.robot.subsystems.tunnel.Tunnel;
import frc.robot.subsystems.tunnel.TunnelIO;
import frc.robot.subsystems.tunnel.TunnelIOReal;
import frc.robot.subsystems.tunnel.TunnelIOSim;
import frc.robot.subsystems.vision.Vision;
import java.util.Optional;
import java.util.Map;
import org.ironmaple.simulation.SimulatedArena;
import org.ironmaple.simulation.seasonspecific.rebuilt2026.Arena2026Rebuilt;
import org.littletonrobotics.junction.LoggedRobot;
import org.littletonrobotics.junction.Logger;
import org.littletonrobotics.junction.networktables.NT4Publisher;
import org.littletonrobotics.junction.wpilog.WPILOGWriter;
import org.photonvision.PhotonCamera;
import tune.TuneManager;

public class Robot extends LoggedRobot {
  public Command m_autonomousCommand;
  public ButtonBindings robotContainer;

  public static Alliance getAlliance() {
    return DriverStation.getAlliance().orElse(Alliance.Red);
  }

  public static boolean isRedAlliance() {
    return getAlliance() == Alliance.Red;
  }

  public RobotConfig robotConfig;
  public AutonomousSelector autonomousSelector;

  public Swerve swerve;
  public Superstructure superstructure;

  public Vision vision;

  public JuicerIO juicerIO;
  public IntakeIO intakeIO;
  public TreadmillIO treadmillIO;
  public TunnelIO tunnelIO;
  public ShooterIO shooterIO;
  public HoodIO hoodIO;

  public IntakeIOSim intakeIOSim;
  public ShooterIOSim shooterIOSim;

  public Juicer juicer;
  public Intake intake;
  public Treadmill treadmill;
  public Tunnel tunnel;
  public Hood hood;
  public Shooter shooter;

  public static PathPlannerPath DepotDoubleDipA;
  public static PathPlannerPath LongShotDepotDoubleDipA;
  public static PathPlannerPath DepotDoubleDipB;
  public static PathPlannerPath LongShotDepotDoubleDipB;
  public static PathPlannerPath DepotDoubleDipC;
  public static PathPlannerPath DepotDoubleDipD;
  public static PathPlannerPath GreedyDepotDoubleDipD;
  public static PathPlannerPath DepotDoubleDipE;
  public static PathPlannerPath GreedyDepotDoubleDipE;
  public static PathPlannerPath DepotDoubleDipF;
  public static PathPlannerPath DepotDoubleDipG;

  public static PathPlannerPath DepotScore3rdBotA;
  public static PathPlannerPath DepotScore3rdBotB;
  public static PathPlannerPath DepotScore3rdBotC;
  public static PathPlannerPath DepotScore3rdBotDBump;
  public static PathPlannerPath DepotScore3rdBotDTrench;

  public static PathPlannerPath DepotSteal3rdBotAMid;
  public static PathPlannerPath DepotSteal3rdBotBMid;

  public static PathPlannerPath DepotSteal3rdBotASide;
  public static PathPlannerPath DepotSteal3rdBotBSide;

  public static PathPlannerPath DepotSteal3rdBotC;

  public static PathPlannerPath DepotSteal3rdBotDBump;
  public static PathPlannerPath DepotSteal3rdBotDTrench;

  public static PathPlannerPath TestA;
  public static PathPlannerPath TestB;

  private CANdle leds = new CANdle(59, "dabus");

  public static final RobotInputsAutoStruct robotInputs = RobotInputs.instance;

  public static final boolean JUICER_INSTALLED = true;

  public Map<String, PhotonCamera> cameras;

  public Robot() {
    if (Utils.isSimulation()) {
      SimulatedArena.overrideInstance(new Arena2026Rebuilt());
    }

    Logger.recordMetadata("2026-Delta", "Delta");
    Logger.addDataReceiver(new WPILOGWriter("/home/lvuser/logs"));
    Logger.addDataReceiver(new NT4Publisher());
    Logger.start();
    SignalLogger.start();

    swerve = new Swerve(
        TunerConstants.DrivetrainConstants,
        100,
        VecBuilder.fill(0.01, 0.01, 0.002),
        VecBuilder.fill(0.01, 0.01, 0.002),
        TunerConstants.FrontLeft,
        TunerConstants.FrontRight,
        TunerConstants.BackLeft,
        TunerConstants.BackRight);

    if (Utils.isSimulation()) {
      intakeIOSim = new IntakeIOSim();
      intakeIOSim.attachToSimulation(swerve.getSimDrivetrain().mapleSimDrive);
      intakeIO = intakeIOSim;

      treadmillIO = new TreadmillIOSim();
      tunnelIO = new TunnelIOSim();

      shooterIOSim = new ShooterIOSim();
      shooterIOSim.attachToSimulation(
          swerve.getSimDrivetrain().mapleSimDrive,
          intakeIOSim.getIntakeSimulation(),
          swerve::getRobotRelativeSpeeds,
          () -> tunnel != null && tunnel.getState() == Tunnel.TunnelState.FEED,
          () -> hood != null ? hood.getAngle() : 45.0);
      shooterIO = shooterIOSim;

      hoodIO = new HoodIOSim();
      juicerIO = new JuicerIOSim();
    } else {
      juicerIO = JUICER_INSTALLED ? new JuicerIOReal() : new JuicerIODisabled();
      intakeIO = new IntakeIOReal();
      treadmillIO = new TreadmillIOReal();
      tunnelIO = new TunnelIOReal();
      shooterIO = new ShooterIOReal();
      hoodIO = new HoodIOReal();
    }

    juicer = new Juicer("Subsystems/Juicer", juicerIO);
    intake = new Intake("Subsystems/Intake", intakeIO);
    treadmill = new Treadmill("Subsystems/Treadmill", treadmillIO);
    shooter = new Shooter("Subsystems/Shooter", shooterIO);
    tunnel = new Tunnel("Subsystems/Tunnel", tunnelIO, shooter);
    hood = new Hood("Subsystems/Hood", hoodIO);

    robotInputs.juicer = juicer.inputs;
    robotInputs.intake = intake.inputs;
    robotInputs.treadmill = treadmill.inputs;
    robotInputs.tunnel = tunnel.inputs;
    robotInputs.shooter = shooter.inputs;
    robotInputs.hood = hood.inputs;

    superstructure = new Superstructure(this);

    CANdleConfiguration candleConfig = new CANdleConfiguration();

    candleConfig.LED.BrightnessScalar = 0.75;
    candleConfig.LED.StripType = StripTypeValue.RGB;
    candleConfig.CANdleFeatures.VBatOutputMode = VBatOutputModeValue.On;

    leds.getConfigurator().apply(candleConfig);

    cameras = new java.util.HashMap<>();
    String[] cameraNames = Constants.Vision.CAMERA_TRANSFORMS.keySet().toArray(String[]::new);
    java.util.Arrays.sort(cameraNames);
    PhotonCamera[] cameraArray = new PhotonCamera[cameraNames.length];
    for (int i = 0; i < cameraNames.length; i++) {
      cameraArray[i] = new PhotonCamera(cameraNames[i]);
      cameras.put(cameraNames[i], cameraArray[i]);
    }

    vision = new Vision(cameraArray);
    vision.setDataInterfaces(swerve::getPose, swerve::addVisionMeasurement);
    vision.setShootingModeSupplier(() -> superstructure.isAiming());

    try {
      robotConfig = RobotConfig.fromGUISettings();
    } catch (Exception e) {
      System.out.println("Error loading RobotConfig from GUI settings:");
      e.printStackTrace();
    }

    ButtonBindings.configureBindings(this);

    DepotDoubleDipA = loadPath("DepotDoubleDipA");
    DepotDoubleDipB = loadPath("DepotDoubleDipB");
    DepotDoubleDipC = loadPath("DepotDoubleDipC");
    DepotDoubleDipD = loadPath("DepotDoubleDipD");
    DepotDoubleDipE = loadPath("DepotDoubleDipE");
    DepotDoubleDipF = loadPath("DepotDoubleDipF");
    DepotDoubleDipG = loadPath("DepotDoubleDipG");

    GreedyDepotDoubleDipD = loadPath("GreedyDepotDoubleDipD");
    GreedyDepotDoubleDipE = loadPath("GreedyDepotDoubleDipE");

    LongShotDepotDoubleDipA = loadPath("LongDepotDoubleDipA");
    LongShotDepotDoubleDipB = loadPath("LongDepotDoubleDipB");

    DepotScore3rdBotA = loadPath("DepotScore3rdBotA");
    DepotScore3rdBotB = loadPath("DepotScore3rdBotB");
    DepotScore3rdBotC = loadPath("DepotScore3rdBotC");
    DepotScore3rdBotDBump = loadPath("DepotScore3rdBotDBumpOut");
    DepotScore3rdBotDTrench = loadPath("DepotScore3rdBotDTrenchOut");

    DepotSteal3rdBotAMid = loadPath("DepotSteal3rdBotAMid");
    DepotSteal3rdBotBMid = loadPath("DepotSteal3rdBotBMid");

    DepotSteal3rdBotASide = loadPath("DepotSteal3rdBotASide");
    DepotSteal3rdBotBSide = loadPath("DepotSteal3rdBotBSide");

    DepotSteal3rdBotC = loadPath("DepotSteal3rdBotC");

    DepotSteal3rdBotDBump = loadPath("DepotSteal3rdBotDBumpOut");
    DepotSteal3rdBotDTrench = loadPath("DepotSteal3rdBotDTrenchOut");

    TestA = loadPath("TestA");
    TestB = loadPath("TestB");

    TuneManager.init("frc.robot");
  }

  private static PathPlannerPath loadPath(String name) {
    try {
      return PathPlannerPath.fromPathFile(name);
    } catch (Exception e) {
      DriverStation.reportError(
          "Failed to load " + name + ": " + e.getMessage(), e.getStackTrace());
      return null;
    }
  }

  @Override
  public void robotInit() {
    RobotController.setBrownoutVoltage(6);

    autonomousSelector = new AutonomousSelector(this, swerve, superstructure, intake);
    autonomousSelector.initializeRoutines(swerve, superstructure, intake);

    var buttonsTable = NetworkTableInstance.getDefault().getTable("Buttons");
    buttonsTable.getEntry("Home Hood").setBoolean(false);
    buttonsTable.getEntry("Home Juicer").setBoolean(false);
    buttonsTable.getEntry("Starting Config State").setBoolean(false);
    buttonsTable.getEntry("Unjam Floor and Tunnel").setBoolean(false);

    var cl = NetworkTableInstance.getDefault().getTable("Checklist");
    cl.getEntry("FrontRight Camera").setBoolean(false);
    cl.getEntry("RightSide Camera").setBoolean(false);
    cl.getEntry("LeftSide Camera").setBoolean(false);
    cl.getEntry("FrontLeft Camera").setBoolean(false);
    cl.getEntry("No Camera Mismatch").setBoolean(false);
    cl.getEntry("Juicer Position").setDouble(0.0);
    cl.getEntry("Hood Angle").setDouble(0.0);
    cl.getEntry("Distance From Auto Start").setDouble(-1.0);
  }

  @Override
  public void robotPeriodic() {
    SignalRefreshManager.refreshAll();

    if (JUICER_INSTALLED)
      juicer.updateInputs();
    intake.updateInputs();
    treadmill.updateInputs();
    tunnel.updateInputs();
    shooter.updateInputs();
    hood.updateInputs();

    Logger.processInputs("Inputs", robotInputs);

    CommandScheduler.getInstance().run();

    if (JUICER_INSTALLED)
      juicer.processState();
    intake.processState();
    treadmill.processState();
    tunnel.processState();
    shooter.processState();
    hood.processState();

    Logger.recordOutput("Robot/RobotPose", swerve.getPose());

  }

  @Override
  public void disabledInit() {}

  private boolean publishChecklist() {
    var cl = NetworkTableInstance.getDefault().getTable("Checklist");

    boolean frontRight = vision.isCameraConnected(0);
    boolean rightSide = vision.isCameraConnected(1);
    boolean leftSide = vision.isCameraConnected(2);
    boolean frontLeft = vision.isCameraConnected(3);
    boolean noMismatch = !vision.isCameraNameMismatch();
    cl.getEntry("FrontRight Camera").setBoolean(frontRight);
    cl.getEntry("RightSide Camera").setBoolean(rightSide);
    cl.getEntry("LeftSide Camera").setBoolean(leftSide);
    cl.getEntry("FrontLeft Camera").setBoolean(frontLeft);
    cl.getEntry("No Camera Mismatch").setBoolean(noMismatch);
    double juicerPosition = juicer.getPosition();
    double hoodAngle = hood.getAngle();
    cl.getEntry("Juicer Position").setDouble(juicerPosition);
    cl.getEntry("Hood Angle").setDouble(hoodAngle);

    Optional<Pose2d> autoStart = autonomousSelector.getAutoStartPose();
    double distanceFromAutoStart = -1.0;
    if (autoStart.isPresent()) {
      Pose2d start = autoStart.get();
      Pose2d current = swerve.getPose();
      distanceFromAutoStart = current.getTranslation().getDistance(start.getTranslation());
    }
    cl.getEntry("Distance From Auto Start").setDouble(distanceFromAutoStart);

    return frontRight && rightSide && leftSide && frontLeft && noMismatch;
  }

  @Override
  public void disabledPeriodic() {
    boolean allReady = publishChecklist();
    if (allReady) {
      leds.setControl(new SolidColor(0, 399).withColor(new RGBWColor(0, 255, 0, 0)));
    } else {
      leds.setControl(new SolidColor(0, 399).withColor(new RGBWColor(255, 0, 0, 0)));
    }

    try {
      Pose2d current = swerve.getPose();
      double midlineX = 8.0;
      double toleranceMeters = 1.0;
      if (Math.abs(current.getX() - midlineX) <= toleranceMeters) {
        swerve.configNeutralMode(NeutralModeValue.Brake);
      }
    } catch (Exception e) {
    }
  }

  @Override
  public void disabledExit() {
  }

  @Override
  public void autonomousInit() {
    if (intakeIOSim != null) {
      intakeIOSim.preloadGamePieces(8);
    }

    m_autonomousCommand = getAutonomousCommand();

    if (m_autonomousCommand != null) {
      CommandScheduler.getInstance().schedule(m_autonomousCommand);
    }

    hood.requestReset();
    juicer.requestReset();
    superstructure.setWantedState(SuperState.IDLE);
    superstructure.requestIntakeFlowIdle();
    swerve.setDriveCurrentLimits(80, 60);
  }

  @Override
  public void autonomousPeriodic() {
    if (Math.abs(intake.getPivotPosition()) > 0.1) {
      leds.setControl(
          new StrobeAnimation(0, 399).withColor(new RGBWColor(255, 0, 0, 0)).withFrameRate(4));
    } else {
      leds.setControl(
          new SolidColor(0, 399).withColor(new RGBWColor(0, 255, 0, 0)));
    }

    if (superstructure.rumbleCuzItsGoinUp) {
      leds.setControl(
          new SolidColor(0, 399).withColor(new RGBWColor(255, 0, 255, 0)));
    }
  }

  @Override
  public void autonomousExit() {
    superstructure.setWantedState(SuperState.IDLE);
    superstructure.requestIntakeFlowIdle();

    try {
      swerve.configNeutralMode(NeutralModeValue.Coast);
    } catch (Exception e) {
    }
  }

  @Override
  public void teleopInit() {
    if (m_autonomousCommand != null) {
      m_autonomousCommand.cancel();
    }
    if (superstructure.getCurrentState() == SuperState.STARTING_CONFIG
        && hood.isZeroingComplete()
        && juicer.isZeroingComplete()) {
      superstructure.setWantedState(SuperState.IDLE);
    }
    if (ButtonBindings.driver.getRightTriggerAxis() > 0.5) {
      superstructure.requestIntakingForStorage();
    } else if (ButtonBindings.driver.getLeftTriggerAxis() > 0.5) {
      superstructure.requestOuttaking();
    }

    try {
      swerve.configNeutralMode(NeutralModeValue.Brake);
    } catch (Exception e) {
    }

    swerve.setDriveCurrentLimits(80, 40);
  }

  @Override
  public void teleopPeriodic() {
    if (Math.abs(intake.getPivotPosition()) > 0.1) {
      leds.setControl(
          new StrobeAnimation(0, 399).withColor(new RGBWColor(255, 0, 0, 0)).withFrameRate(4));
    } else {
      leds.setControl(
          new SolidColor(0, 399).withColor(new RGBWColor(0, 255, 0, 0)));
    }

    if (superstructure.rumbleCuzItsGoinUp) {
      leds.setControl(
          new SolidColor(0, 399).withColor(new RGBWColor(255, 0, 255, 0)));
    }
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

  @Override
  public void simulationInit() {
    DriverStationSim.setAllianceStationId(AllianceStationID.Blue1);
    DriverStationSim.notifyNewData();
    if (DepotDoubleDipA != null && DepotDoubleDipA.getStartingHolonomicPose().isPresent()) {
      Pose2d startPose = DepotDoubleDipA.getStartingHolonomicPose().get();
      if (getAlliance() == Alliance.Red) {
        startPose = DepotDoubleDipA.flipPath().getStartingHolonomicPose().get();
      }
      swerve.resetSwervePose(startPose);
    } else {
      swerve.resetSwervePose(new Pose2d(4, 4, new Rotation2d()));
    }
    SimulatedArena.getInstance().resetFieldForAuto();
  }

  @Override
  public void simulationPeriodic() {
    Pose2d simPose = swerve.getSimDrivetrain().mapleSimDrive.getSimulatedDriveTrainPose();
    vision.simulationPeriodic(simPose);

    Logger.recordOutput(
        "FieldSimulation/Fuel", SimulatedArena.getInstance().getGamePiecesArrayByType("Fuel"));
    Logger.recordOutput("FieldSimulation/SimulatedPose", simPose);

    logHopperGamePieces(simPose);
  }

  private void logHopperGamePieces(Pose2d robotPose) {
    if (intakeIOSim == null || intakeIOSim.getIntakeSimulation() == null) {
      return;
    }
    int numPieces = intakeIOSim.getIntakeSimulation().getGamePiecesAmount();
    if (numPieces == 0) {
      Logger.recordOutput("FieldSimulation/HopperFuel", new Pose3d[0]);
      return;
    }

    Pose3d[] gamePiecePoses = new Pose3d[numPieces];
    double baseZ = 0.15;
    double spacing = 0.12;
    int cols = 4;
    int rows = 4;
    int gridSize = cols * rows;

    for (int i = 0; i < numPieces; i++) {
      int layer = i / gridSize;
      int indexInLayer = i % gridSize;
      int row = indexInLayer / cols;
      int col = indexInLayer % cols;

      double xOffset = (row - (rows - 1) / 2.0) * spacing;
      double yOffset = (col - (cols - 1) / 2.0) * spacing;
      double zOffset = baseZ + layer * 0.10;

      gamePiecePoses[i] = new Pose3d(xOffset, yOffset, zOffset, new Rotation3d());
    }

    Logger.recordOutput("FieldSimulation/HopperFuel", gamePiecePoses);
  }

  public Command getAutonomousCommand() {
    return autonomousSelector.get();
  }

  public void resetSwerveToAutoPose() {
    Command auto = autonomousSelector.get();
    if (auto == null) {
      System.out.println("resetSwerveToAutoPose: no auto selected");
      return;
    }
    try {
      java.lang.reflect.Method method = auto.getClass().getMethod("resetSwervePoseToAutoPose");
      method.invoke(auto);
    } catch (Exception e) {
      System.out
          .println("resetSwerveToAutoPose: failed for " + auto.getClass().getSimpleName() + ": " + e.getMessage());
    }
  }
}
