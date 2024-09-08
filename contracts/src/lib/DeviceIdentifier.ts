import { CircuitString, Field, Poseidon, Struct } from 'o1js';
import { MacAddressField } from './DeviceIdentifierHelper.js';

export interface RawIdentifiers {
  cpuId: string;
  systemSerial: string;
  systemUUID: string;
  baseboardSerial: string;
  macAddress: string[];
  diskSerial: string;
}

export class Identifiers extends Struct({
  cpuId: Field,
  systemSerial: CircuitString,
  systemUUID: Field,
  baseboardSerial: CircuitString,
  macAddress: MacAddressField,
  diskSerial: CircuitString,
}) {}
