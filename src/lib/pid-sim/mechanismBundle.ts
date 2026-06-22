import type { CodeTourStep } from './guides/codeTourSteps';
import type { TuningGuideStep } from './guides/tuningGuideSteps';
import type { ArmPlantConfig, MechanismType, ParseResult, PlantConfig, TuningConfig, Vendor } from './types';

export interface MechanismBundle {
  parseCode: (source: string, vendor: Vendor) => ParseResult;
  getSubsystemTemplate: (
    vendor: Vendor,
    config: TuningConfig,
    plant: PlantConfig | ArmPlantConfig,
  ) => string;
  getRobotTemplate: (vendor: Vendor) => string;
  parsePlantFromCode: (source: string) => PlantConfig | ArmPlantConfig;
  plantWarningsFor: (plant: PlantConfig | ArmPlantConfig, setpointRot?: number) => string[];
  plantsEqual: (a: PlantConfig | ArmPlantConfig, b: PlantConfig | ArmPlantConfig) => boolean;
  findPlantLine: (source: string) => number | null;
  referencePlant: PlantConfig | ArmPlantConfig;
  defaultSetpointRot: number;
  codeTourSteps: CodeTourStep[];
  tuningGuideSteps: TuningGuideStep[];
  travelFractionToSetpoint: (fraction: number, plant: PlantConfig | ArmPlantConfig) => number;
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
      plantWarningsFor: armPlantParser.armPlantWarnings,
      plantsEqual: armPlantParser.armPlantsEqual,
      findPlantLine: armPlantParser.findArmPlantSectionLine,
      referencePlant: reference.REFERENCE_ARM_PLANT,
      defaultSetpointRot: reference.DEFAULT_ARM_SETPOINT_ROT,
      codeTourSteps: codeTour.ARM_CODE_TOUR_STEPS,
      tuningGuideSteps: tuning.ARM_TUNING_GUIDE_STEPS,
      travelFractionToSetpoint: units.travelFractionToSetpointRot,
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
    plantWarningsFor: plantParser.plantWarnings,
    plantsEqual: plantParser.plantsEqual,
    findPlantLine: plantParser.findPlantSectionLine,
    referencePlant: reference.REFERENCE_PLANT,
    defaultSetpointRot: reference.DEFAULT_SETPOINT_ROT,
    codeTourSteps: codeTourMod.CODE_TOUR_STEPS,
    tuningGuideSteps: tuningMod.TUNING_GUIDE_STEPS,
    travelFractionToSetpoint: teleop.travelFractionToSetpointRot,
    patchConstant,
    findConstLine,
  };
}
