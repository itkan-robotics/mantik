import type { Vendor } from '../types';
import type { DCMotorModel } from './dcMotor';
import { getKrakenX60, getNeo } from './dcMotor';

/** Motor model for browser physics — matches vendor template choice. */
export function motorForVendor(vendor: Vendor): DCMotorModel {
  return vendor === 'rev' ? getNeo(1) : getKrakenX60(1);
}
