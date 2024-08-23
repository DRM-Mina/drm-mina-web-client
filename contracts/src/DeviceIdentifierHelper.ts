import { CircuitString, Field, Struct } from 'o1js';
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

export class MacAddressField extends Struct({
  ethernet: Field,
  wifi: Field,
}) {
  constructor(macAddress: { ethernet: Field; wifi: Field }) {
    macAddress.ethernet.assertNotEquals(Field(0));
    macAddress.wifi.assertNotEquals(Field(0));
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
    const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
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
      return macAddress.toField();
    });
    return new MacAddressField({ ethernet, wifi });
  }
}
