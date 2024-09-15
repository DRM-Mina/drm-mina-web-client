import { CircuitString, Field, Poseidon, Struct } from 'o1js';
import {
  MacAddress,
  MacAddressField,
  Serial,
  UUID,
} from './DeviceIdentifierHelper.js';

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
  constructor(
    public cpuId: Field,
    public systemSerial: CircuitString,
    public systemUUID: CircuitString,
    public baseboardSerial: CircuitString,
    public macAddress: MacAddressField,
    public diskSerial: CircuitString
  ) {
    super({
      cpuId,
      systemSerial,
      systemUUID,
      baseboardSerial,
      macAddress,
      diskSerial,
    });
  }

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

  static fromRaw(raw: RawIdentifiers): Identifiers {
    const cpuId = Field.from(raw.cpuId);
    const systemSerial = Serial.fromStringToCircuitString(raw.systemSerial);
    const systemUUID = UUID.fromStringToCircuitString(raw.systemUUID);
    const baseboardSerial = Serial.fromStringToCircuitString(
      raw.baseboardSerial
    );
    const macAddress = MacAddress.fromStringArrayToMacAddressField(
      raw.macAddress
    );
    const diskSerial = Serial.fromStringToCircuitString(raw.diskSerial);

    return new Identifiers(
      cpuId,
      systemSerial,
      systemUUID,
      baseboardSerial,
      macAddress,
      diskSerial
    );
  }

  hash() {
    return Poseidon.hash(this.toFields());
  }
}
