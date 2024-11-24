import { Field, ZkProgram } from 'o1js';
import { Identifiers } from './DeviceIdentifier.js';

export const DeviceIdentifier = ZkProgram({
  name: 'DeviceIdentifier',
  publicOutput: Field,
  methods: {
    proofForDevice: {
      privateInputs: [Identifiers],
      async method(identifiers: Identifiers) {
        // check cpuId if empty (currently not checked)

        // check systemSerial if empty
        const systemSerial = identifiers.systemSerial;
        systemSerial.length().assertGreaterThan(Field(0));

        // check systemUUID strict
        const systemUUID = identifiers.systemUUID;
        systemUUID.length().assertEquals(Field(32));

        for (let i = 0; i < 32; i++) {
          const currentChar = systemUUID.values[i].toField();
          const char = currentChar
            .greaterThanOrEqual(Field(65))
            .and(currentChar.lessThanOrEqual(Field(70)));
          const digit = currentChar
            .greaterThanOrEqual(Field(48))
            .and(currentChar.lessThanOrEqual(Field(57)));
          char.or(digit).assertTrue();
        }

        // check baseboardSerial if empty
        const baseboardSerial = identifiers.baseboardSerial;
        baseboardSerial.length().assertGreaterThan(Field(0));

        // check macAddress strict
        const macAddress = identifiers.macAddress;
        macAddress.ethernet.length().assertEquals(Field(12));
        macAddress.wifi.length().assertEquals(Field(12));

        for (let i = 0; i < 12; i++) {
          let A = macAddress.ethernet.values[i]
            .toField()
            .greaterThanOrEqual(Field(65));
          let Z = macAddress.ethernet.values[i]
            .toField()
            .lessThanOrEqual(Field(90));

          let zero = macAddress.ethernet.values[i]
            .toField()
            .greaterThanOrEqual(Field(48));
          let nine = macAddress.ethernet.values[i]
            .toField()
            .lessThanOrEqual(Field(57));

          A.and(Z).or(zero.and(nine)).assertTrue();

          A = macAddress.wifi.values[i].toField().greaterThanOrEqual(Field(65));
          Z = macAddress.wifi.values[i].toField().lessThanOrEqual(Field(90));

          zero = macAddress.wifi.values[i]
            .toField()
            .greaterThanOrEqual(Field(48));

          nine = macAddress.wifi.values[i].toField().lessThanOrEqual(Field(57));

          A.and(Z).or(zero.and(nine)).assertTrue();
        }

        return { publicOutput: identifiers.hash() };
      },
    },
  },
});

export class DeviceIdentifierProof extends ZkProgram.Proof(DeviceIdentifier) {}
