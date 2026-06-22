import type { CodeTourStep } from './guides/codeTourSteps';
import type { TuningGuideStep } from './guides/tuningGuideSteps';
import type {
  ArmPlantConfig,
  FlywheelPlantConfig,
  MechanismType,
  ParseResult,
  PlantConfig,
  TuningConfig,
  Vendor,
} from './types';

export type MechanismPlantConfig = PlantConfig | ArmPlantConfig | FlywheelPlantConfig;

export interface MechanismBundle {
  parseCode: (source: string, vendor: Vendor) => ParseResult;
  getSubsystemTemplate: (vendor: Vendor, config: TuningConfig, plant: MechanismPlantConfig) => string;
  getRobotTemplate: (vendor: Vendor) => string;
  parsePlantFromCode: (source: string) => MechanismPlantConfig;
  plantWarningsFor: (plant: MechanismPlantConfig, setpoint?: number) => string[];
  plantsEqual: (a: MechanismPlantConfig, b: MechanismPlantConfig) => boolean;
  findPlantLine: (source: string) => number | null;
  referencePlant: MechanismPlantConfig;
  defaultSetpointRot: number;
  codeTourSteps: CodeTourStep[];
  tuningGuideSteps: TuningGuideStep[];
  travelFractionToSetpoint: (fraction: number, plant: MechanismPlantConfig) => number;
  patchConstant: (source: string, name: string, value: number) => string;
  findConstLine: (source: string, constName: string) => number | null;
}

export async function loadMechanismBundle(mechanism: MechanismType): Promise<MechanismBundle> {
  const { patchConstant, findConstLine } = await import('./parser/elevatorParser');

  if (mechanism === 'arm') {
    const [armParser, armPlantParser, codeTour, tuning, reference, units] = await Promise.all([
      import('./parser/armParser'),
      import('./parser/armPlantParser'),
      import('./guides/arm/codeTourSteps'),
      import('./guides/arm/tuningGuideSteps'),
      import('./reference/armReference'),
      import('./physics/units/armUnits'),
    ]);
    return {
      parseCode: armParser.parseArmCode,
      getSubsystemTemplate: armParser.getArmTemplateForVendor,
      getRobotTemplate: armParser.getArmRobotTemplateForVendor,
      parsePlantFromCode: armPlantParser.parseArmPlantConfig,
      plantWarningsFor: (plant, setpointRot) =>
        armPlantParser.armPlantWarnings(plant as ArmPlantConfig, setpointRot),
      plantsEqual: (a, b) => armPlantParser.armPlantsEqual(a as ArmPlantConfig, b as ArmPlantConfig),
      findPlantLine: armPlantParser.findArmPlantSectionLine,
      referencePlant: reference.REFERENCE_ARM_PLANT,
      defaultSetpointRot: reference.DEFAULT_ARM_SETPOINT_ROT,
      codeTourSteps: codeTour.ARM_CODE_TOUR_STEPS,
      tuningGuideSteps: tuning.ARM_TUNING_GUIDE_STEPS,
      travelFractionToSetpoint: (fraction, plant) =>
        units.travelFractionToSetpointRot(fraction, plant as PlantConfig),
      patchConstant,
      findConstLine,
    };
  }

  if (mechanism === 'flywheel') {
    const [flyParser, flyPlantParser, codeTour, tuning, reference, teleop] = await Promise.all([
      import('./parser/flywheelParser'),
      import('./parser/flywheelPlantParser'),
      import('./guides/flywheel/codeTourSteps'),
      import('./guides/flywheel/tuningGuideSteps'),
      import('./reference/flywheelReference'),
      import('./teleop/velocityPresets'),
    ]);
    return {
      parseCode: flyParser.parseFlywheelCode,
      getSubsystemTemplate: flyParser.getFlywheelTemplateForVendor,
      getRobotTemplate: flyParser.getFlywheelRobotTemplateForVendor,
      parsePlantFromCode: flyPlantParser.parseFlywheelPlantConfig,
      plantWarningsFor: (plant, setpoint) =>
        flyPlantParser.flywheelPlantWarnings(plant as FlywheelPlantConfig, setpoint),
      plantsEqual: (a, b) =>
        flyPlantParser.flywheelPlantsEqual(a as FlywheelPlantConfig, b as FlywheelPlantConfig),
      findPlantLine: flyPlantParser.findFlywheelPlantSectionLine,
      referencePlant: reference.REFERENCE_FLYWHEEL_PLANT,
      defaultSetpointRot: reference.DEFAULT_FLYWHEEL_SETPOINT_ROT_PER_SEC,
      codeTourSteps: codeTour.FLYWHEEL_CODE_TOUR_STEPS,
      tuningGuideSteps: tuning.FLYWHEEL_TUNING_GUIDE_STEPS,
      travelFractionToSetpoint: (fraction, plant) =>
        teleop.velocityFractionToSetpointRotPerSec(fraction, plant as FlywheelPlantConfig),
      patchConstant,
      findConstLine,
    };
  }

  const [elevatorParser, plantParser, codeTourMod, tuningMod, reference, teleop] = await Promise.all([
    import('./parser/elevatorParser'),
    import('./parser/plantParser'),
    import('./guides/codeTourSteps'),
    import('./guides/tuningGuideSteps'),
    import('./reference/elevatorReference'),
    import('./teleop/travelPresets'),
  ]);

  return {
    parseCode: elevatorParser.parseElevatorCode,
    getSubsystemTemplate: elevatorParser.getTemplateForVendor,
    getRobotTemplate: elevatorParser.getRobotTemplateForVendor,
    parsePlantFromCode: plantParser.parsePlantConfig,
    plantWarningsFor: (plant, setpointRot) =>
      plantParser.plantWarnings(plant as PlantConfig, setpointRot),
    plantsEqual: (a, b) => plantParser.plantsEqual(a as PlantConfig, b as PlantConfig),
    findPlantLine: plantParser.findPlantSectionLine,
    referencePlant: reference.REFERENCE_PLANT,
    defaultSetpointRot: reference.DEFAULT_SETPOINT_ROT,
    codeTourSteps: codeTourMod.CODE_TOUR_STEPS,
    tuningGuideSteps: tuningMod.TUNING_GUIDE_STEPS,
    travelFractionToSetpoint: (fraction, plant) =>
      teleop.travelFractionToSetpointRot(fraction, plant as PlantConfig),
    patchConstant,
    findConstLine,
  };
}
