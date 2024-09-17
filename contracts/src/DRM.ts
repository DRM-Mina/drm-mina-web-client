import {
  PublicKey,
  SmartContract,
  State,
  method,
  state,
  Permissions,
  VerificationKey,
  Bool,
  Struct,
  Field,
  UInt64,
  Experimental,
  TokenId,
  AccountUpdate,
  Provable,
} from 'o1js';
import { DeviceIdentifierProof } from './lib/DeviceIdentifierProof.js';
import { DeviceSessionProof } from './lib/SessionProof.js';
import { GameToken } from './GameToken.js';

const { OffchainState, OffchainStateCommitments } = Experimental;

export class Devices extends Struct({
  device_1: Field,
  device_2: Field,
  device_3: Field,
  device_4: Field,
}) {}

export const offchainState = OffchainState({
  devices: OffchainState.Map(PublicKey, Devices),
  sessions: OffchainState.Map(Field, Field),
});

class StateProof extends offchainState.Proof {}

export class DRM extends SmartContract {
  @state(PublicKey) gameTokenAddress = State<PublicKey>();

  @state(OffchainStateCommitments) offchainState = State(
    OffchainStateCommitments.empty()
  );

  async deploy() {
    await super.deploy();

    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
    });
  }

  @method
  async updateVerificationKey(vk: VerificationKey) {
    this.account.verificationKey.set(vk);
  }

  @method
  async initialize(gameTokenAddress: PublicKey) {
    this.account.provedState.requireEquals(Bool(false));

    this.gameTokenAddress.set(gameTokenAddress);
  }

  @method
  async settle(proof: StateProof) {
    await offchainState.settle(proof);
  }

  @method
  async addDevice(
    userAddress: PublicKey,
    deviceProof: DeviceIdentifierProof,
    deviceIndex: UInt64
  ) {
    deviceProof.verify();
    AccountUpdate.create(userAddress).requireSignature();

    const gameTokenAddress = this.gameTokenAddress.getAndRequireEquals();
    const gameToken = new GameToken(gameTokenAddress);

    // Check if the user has game token
    const gameTokenId = TokenId.derive(gameTokenAddress);
    const accountUpdate = AccountUpdate.create(userAddress, gameTokenId);
    const tokenBalance = accountUpdate.account.balance.getAndRequireEquals();
    gameToken.approveAccountUpdate(accountUpdate);
    tokenBalance.assertGreaterThan(UInt64.zero);

    const maxDeviceAllowed = gameToken.maxDeviceAllowed.getAndRequireEquals();
    deviceIndex.assertLessThan(maxDeviceAllowed);

    const deviceIdentifierHash = deviceProof.publicOutput;
    const prevDevices = (await offchainState.fields.devices.get(userAddress))
      .value;

    const device_1 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(1)),
      deviceIdentifierHash,
      prevDevices.device_1
    );

    const device_2 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(2)),
      deviceIdentifierHash,
      prevDevices.device_2
    );

    const device_3 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(3)),
      deviceIdentifierHash,
      prevDevices.device_3
    );

    const device_4 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(4)),
      deviceIdentifierHash,
      prevDevices.device_4
    );

    const newDevices = new Devices({
      device_1: device_1,
      device_2: device_2,
      device_3: device_3,
      device_4: device_4,
    });

    const changedDevice = Provable.if(
      prevDevices.device_1.equals(newDevices.device_1).not(),
      prevDevices.device_1,
      Provable.if(
        prevDevices.device_2.equals(newDevices.device_2).not(),
        prevDevices.device_2,
        Provable.if(
          prevDevices.device_3.equals(newDevices.device_3).not(),
          prevDevices.device_3,
          Provable.if(
            prevDevices.device_4.equals(newDevices.device_4).not(),
            prevDevices.device_4,
            Field.from(0)
          )
        )
      )
    );
  }

  @method
  async changeDevice(
    userAddress: PublicKey,
    deviceProof: DeviceIdentifierProof,
    deviceIndex: UInt64
  ) {
    deviceProof.verify();
    AccountUpdate.create(userAddress).requireSignature();

    const gameTokenAddress = this.gameTokenAddress.getAndRequireEquals();
    const gameToken = new GameToken(gameTokenAddress);

    // Check if the user has game token
    const gameTokenId = TokenId.derive(gameTokenAddress);
    const accountUpdate = AccountUpdate.create(userAddress, gameTokenId);
    const tokenBalance = accountUpdate.account.balance.getAndRequireEquals();
    gameToken.approveAccountUpdate(accountUpdate);
    tokenBalance.assertGreaterThan(UInt64.zero);

    const maxDeviceAllowed = gameToken.maxDeviceAllowed.getAndRequireEquals();
    deviceIndex.assertLessThan(maxDeviceAllowed);

    const deviceIdentifierHash = deviceProof.publicOutput;
    const prevDevices = (await offchainState.fields.devices.get(userAddress))
      .value;

    const device_1 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(1)),
      deviceIdentifierHash,
      prevDevices.device_1
    );

    const device_2 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(2)),
      deviceIdentifierHash,
      prevDevices.device_2
    );

    const device_3 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(3)),
      deviceIdentifierHash,
      prevDevices.device_3
    );

    const device_4 = Provable.if(
      UInt64.from(deviceIndex).equals(UInt64.from(4)),
      deviceIdentifierHash,
      prevDevices.device_4
    );

    const newDevices = new Devices({
      device_1: device_1,
      device_2: device_2,
      device_3: device_3,
      device_4: device_4,
    });

    const deletedDevice = Provable.if(
      prevDevices.device_1.equals(newDevices.device_1).not(),
      prevDevices.device_1,
      Provable.if(
        prevDevices.device_2.equals(newDevices.device_2).not(),
        prevDevices.device_2,
        Provable.if(
          prevDevices.device_3.equals(newDevices.device_3).not(),
          prevDevices.device_3,
          Provable.if(
            prevDevices.device_4.equals(newDevices.device_4).not(),
            prevDevices.device_4,
            Field.from(0)
          )
        )
      )
    );

    deletedDevice.assertGreaterThan(Field.from(0));

    const deletedDeviceLastSession = (
      await offchainState.fields.sessions.get(deletedDevice)
    ).value;

    offchainState.fields.sessions.update(deletedDevice, {
      from: deletedDeviceLastSession,
      to: Field.from(0),
    });

    offchainState.fields.devices.update(userAddress, {
      from: prevDevices,
      to: newDevices,
    });

    const newDeviceLastSession = (
      await offchainState.fields.sessions.get(deviceIdentifierHash)
    ).value;

    offchainState.fields.sessions.update(deviceIdentifierHash, {
      from: newDeviceLastSession,
      to: Field.from(1),
    });
  }

  @method
  async createSession(deviceSessionProof: DeviceSessionProof) {
    deviceSessionProof.verify();
  }
}
