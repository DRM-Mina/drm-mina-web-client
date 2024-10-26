import { Field, PublicKey, Struct, UInt64, ZkProgram } from 'o1js';
import { Identifiers } from './DeviceIdentifier.js';

export class DeviceSessionInput extends Struct({
  gameToken: PublicKey,
  currentSessionKey: UInt64,
  newSessionKey: UInt64,
}) {}

export class DeviceSessionOutput extends Struct({
  gameToken: PublicKey,
  currentSessionKey: UInt64,
  newSessionKey: UInt64,
  hash: Field,
}) {
  static dummy(gameToken: PublicKey) {
    return new DeviceSessionOutput({
      gameToken: gameToken,
      currentSessionKey: new UInt64(0),
      newSessionKey: new UInt64(0),
      hash: new Field(0),
    });
  }
}

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

        publicInput.currentSessionKey.assertGreaterThan(UInt64.from(0));
        publicInput.newSessionKey.assertGreaterThan(UInt64.from(0));
        publicInput.currentSessionKey.equals(newSessionKey).assertFalse();

        return {
          gameToken: gameToken,
          currentSessionKey: publicInput.currentSessionKey,
          newSessionKey: newSessionKey,
          hash: identifiersHash,
        };
      },
    },
  },
});

export class DeviceSessionProof extends ZkProgram.Proof(DeviceSession) {}
