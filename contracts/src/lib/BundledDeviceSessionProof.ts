import {
  Field,
  Provable,
  PublicKey,
  SelfProof,
  Struct,
  UInt64,
  ZkProgram,
} from 'o1js';
import {
  DeviceSessionOutput,
  DeviceSessionProof,
} from './DeviceSessionProof.js';

export class BundledDeviceSessionOutput extends Struct({
  deviceSessionOutputs: Provable.Array(DeviceSessionOutput, 4),
  deviceCount: Field,
}) {}

export class BundledDeviceSessionProofs extends Struct({
  deviceSessionProofs: Provable.Array(DeviceSessionProof, 4),
}) {}

export const BundledDeviceSession = ZkProgram({
  name: 'BundledDeviceSession',
  publicInput: PublicKey,
  publicOutput: BundledDeviceSessionOutput,
  methods: {
    base: {
      privateInputs: [],
      publicInputs: [PublicKey],
      publicOutputs: [BundledDeviceSessionOutput],
      async method(gameToken: PublicKey) {
        return {
          publicOutput: {
            deviceSessionOutputs: new Array(4).fill(
              DeviceSessionOutput.dummy(gameToken)
            ),
            deviceCount: Field.from(0),
          },
        };
      },
    },

    appendToBundle: {
      privateInputs: [DeviceSessionProof, SelfProof],
      publicInputs: [PublicKey],
      publicOutputs: [BundledDeviceSessionOutput],
      async method(
        gameToken: PublicKey,
        deviceProof: DeviceSessionProof,
        previousBundleProof: SelfProof<PublicKey, BundledDeviceSessionOutput>
      ) {
        deviceProof.verify();
        previousBundleProof.verify();

        deviceProof.publicOutput.hash.assertNotEquals(Field.from(0));
        deviceProof.publicOutput.gameToken.assertEquals(gameToken);
        deviceProof.publicOutput.currentSessionKey.assertGreaterThan(
          UInt64.from(0)
        );
        deviceProof.publicOutput.newSessionKey.assertGreaterThan(
          UInt64.from(0)
        );
        deviceProof.publicOutput.currentSessionKey
          .equals(deviceProof.publicOutput.newSessionKey)
          .assertFalse();

        previousBundleProof.publicInput.assertEquals(gameToken);
        previousBundleProof.publicOutput.deviceCount.assertLessThan(4);

        let deviceSessionOutputs: DeviceSessionOutput[] = new Array(4).fill(
          DeviceSessionOutput.dummy(gameToken)
        );
        for (let i = 0; i < 4; i++) {
          const hash = Provable.if(
            Field.from(i).greaterThan(
              previousBundleProof.publicOutput.deviceCount
            ),
            Field.from(0),
            Provable.if(
              Field.from(i).equals(
                previousBundleProof.publicOutput.deviceCount
              ),
              deviceProof.publicOutput.hash,
              previousBundleProof.publicOutput.deviceSessionOutputs[i].hash
            )
          );

          const currentSession = Provable.if(
            Field.from(i).greaterThan(
              previousBundleProof.publicOutput.deviceCount
            ),
            UInt64.from(0),
            Provable.if(
              Field.from(i).equals(
                previousBundleProof.publicOutput.deviceCount
              ),
              deviceProof.publicOutput.currentSessionKey,
              previousBundleProof.publicOutput.deviceSessionOutputs[i]
                .currentSessionKey
            )
          );

          const newSession = Provable.if(
            Field.from(i).greaterThan(
              previousBundleProof.publicOutput.deviceCount
            ),
            UInt64.from(0),
            Provable.if(
              Field.from(i).equals(
                previousBundleProof.publicOutput.deviceCount
              ),
              deviceProof.publicOutput.newSessionKey,
              previousBundleProof.publicOutput.deviceSessionOutputs[i]
                .newSessionKey
            )
          );

          deviceSessionOutputs[i] = new DeviceSessionOutput({
            gameToken: gameToken,
            currentSessionKey: currentSession,
            newSessionKey: newSession,
            hash: hash,
          });
        }
        const bundle = new BundledDeviceSessionOutput({
          deviceSessionOutputs: deviceSessionOutputs,
          deviceCount: previousBundleProof.publicOutput.deviceCount.add(1),
        });
        return { publicOutput: bundle };
      },
    },
  },
});

export class BundledDeviceSessionProof extends ZkProgram.Proof(
  BundledDeviceSession
) {}
