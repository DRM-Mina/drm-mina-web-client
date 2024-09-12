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
  systemUUID: CircuitString,
  baseboardSerial: CircuitString,
  macAddress: MacAddressField,
  diskSerial: CircuitString,
}) {
  toFields() {
    return [
      this.cpuId,
      this.systemSerial.hash(),
      this.systemUUID.hash(),
      this.baseboardSerial.hash(),
      this.macAddress.ethernet.hash(),
      this.macAddress.wifi.hash(),
      this.diskSerial.hash(),
    ];
  }

  hash() {
    return Poseidon.hash(this.toFields());
  }
}
