import { Field, PublicKey, Struct, UInt64, ZkProgram } from 'o1js';
import { Identifiers } from './DeviceIdentifier.js';

export class DeviceSessionInput extends Struct({
  gameToken: PublicKey,
  currentSessionKey: UInt64,
  newSessionKey: UInt64,
}) {}

export class DeviceSessionOutput extends Struct({
  gameToken: PublicKey,
  newSessionKey: UInt64,
  hash: Field,
}) {}

export const DeviceSession = ZkProgram({
  name: 'DeviceSession',
  publicInput: DeviceSessionInput,
  publicOutput: DeviceSessionOutput,
  methods: {
    proofForSession: {
      privateInputs: [Identifiers],
      async method(publicInput: DeviceSessionInput, identifiers: Identifiers) {
        const identifiersHash = identifiers.hash();
        const newSessionKey = publicInput.newSessionKey;
        const gameToken = publicInput.gameToken;

        return {
          gameToken: gameToken,
          newSessionKey: newSessionKey,
          hash: identifiersHash,
        };
      },
    },
  },
});

export class DeviceSessionProof extends ZkProgram.Proof(DeviceSession) {}
