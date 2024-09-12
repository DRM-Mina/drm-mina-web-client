import { CircuitString, Field, Struct } from 'o1js';
import { macAddressRegex, uuidRegex } from './constants.js';

export class UUID {
  constructor(public uuid: string) {
    if (!this.isValid()) {
      throw new Error('Invalid UUID');
    }
    this.uuid = uuid.replace(/-/g, '').toUpperCase();
  }

  isValid(): boolean {
    return uuidRegex.test(this.uuid);
  }

  toBigNumber(): string {
    return BigInt('0x' + this.uuid).toString(10);
  }

  public toField(): Field {
    const bigint = this.toBigNumber();
    return Field(bigint);
  }

  public static fromStringToCircuitString(uuid: string): CircuitString {
    if (!uuidRegex.test(uuid)) throw new Error('Invalid UUID');
    uuid = uuid.replace(/-/g, '').toUpperCase();
    const circuitString = CircuitString.fromString(uuid);
    return circuitString;
  }
}

export class Serial {
  constructor(public serial: string) {
    serial = serial.toUpperCase();
  }

  toCircuitString(): CircuitString {
    return CircuitString.fromString(this.serial);
  }
  static isEqual(a: Serial, b: Serial) {
    const aStr = a.toCircuitString();
    const bStr = b.toCircuitString();
    return aStr.equals(bStr);
  }

  public static fromStringToCircuitString(serial: string): CircuitString {
    serial = serial.toUpperCase();
    return CircuitString.fromString(serial);
  }
}

export class MacAddressField extends Struct({
  ethernet: CircuitString,
  wifi: CircuitString,
}) {
  constructor(macAddress: { ethernet: CircuitString; wifi: CircuitString }) {
    super(macAddress);
  }
}

export class MacAddress {
  constructor(public macAddress: string) {
    if (!this.isValid()) {
      throw new Error('Invalid MAC Address');
    }
    this.macAddress = this.macAddress
      .replace(/:/g, '')
      .replace(/-/g, '')
      .toUpperCase();
  }

  isValid(): boolean {
    return macAddressRegex.test(this.macAddress);
  }

  public toBigNumber(): string {
    return BigInt('0x' + this.macAddress).toString(10);
  }

  public toField(): Field {
    const bigint = this.toBigNumber();
    return Field(bigint);
  }

  static fromStringArrayToMacAddressField(
    macAddress: string[]
  ): MacAddressField {
    const [ethernet, wifi] = macAddress.map((mac) => {
      const macAddress = new MacAddress(mac);
      return CircuitString.fromString(macAddress.macAddress);
    });
    return new MacAddressField({ ethernet, wifi });
  }
}
