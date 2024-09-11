import { Field, ZkProgram } from 'o1js';
import { Identifiers } from './DeviceIdentifier.js';

export const DeviceIdentifier = ZkProgram({
  name: 'DeviceIdentifier',
  publicOutput: Field,
  methods: {
    proofForDevice: {
      privateInputs: [Identifiers],
      async method(identifiers: Identifiers) {
        // TODO: Implement check for device identifier

        return identifiers.hash();
      },
    },
  },
});

export class DeviceIdentifierProof extends ZkProgram.Proof(DeviceIdentifier) {}
