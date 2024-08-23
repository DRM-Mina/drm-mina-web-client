import { CircuitString, Field } from 'o1js';
import { uuidRegex } from './constants.js';

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

  public static fromStringToField(uuid: string): Field {
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(uuid)) throw new Error('Invalid UUID');
    uuid = uuid.replace(/-/g, '').toUpperCase();
    const bigint = BigInt('0x' + uuid).toString(10);
    return Field(bigint);
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
