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
import { DeviceSessionProof } from './lib/DeviceSessionProof.js';
import { GameToken } from './GameToken.js';

const { OffchainState } = Experimental;

export class Devices extends Struct({
  device_1: Field,
  device_2: Field,
  device_3: Field,
  device_4: Field,
}) {
  static empty(): Devices {
    return new Devices({
      device_1: Field.from(0),
      device_2: Field.from(0),
      device_3: Field.from(0),
      device_4: Field.from(0),
    });
  }
}

export const offchainState = OffchainState(
  {
    devices: OffchainState.Map(PublicKey, Devices),
    sessions: OffchainState.Map(Field, UInt64),
  },
  {
    logTotalCapacity: 20,
    maxActionsPerProof: 5,
  }
);

export class StateProof extends offchainState.Proof {}

export class DRM extends SmartContract {
  @state(PublicKey) gameTokenAddress = State<PublicKey>();

  @state(OffchainState.Commitments) offchainStateCommitments =
    offchainState.emptyCommitments();

  readonly events = {
    Session: SessionEvent,
  };

  async deploy() {
    await super.deploy();

    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
    });
  }

  offchainState = offchainState.init(this);

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
    await this.offchainState.settle(proof);
  }

  @method
  async initAndAddDevice(
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
    await gameToken.approveAccountUpdate(accountUpdate);
    tokenBalance.assertGreaterThan(UInt64.zero);

    // TODO: getAndRequireEquals()
    const maxDeviceAllowed = gameToken.maxDeviceAllowed.get();
    deviceIndex.assertGreaterThan(UInt64.from(0));
    deviceIndex.assertLessThanOrEqual(maxDeviceAllowed);

    const deviceIdentifierHash = deviceProof.publicOutput;

    (
      await this.offchainState.fields.devices.get(userAddress)
    ).isSome.assertFalse('User already init devices');

    const prevDevices = Devices.empty();

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

    this.offchainState.fields.devices.update(userAddress, {
      from: undefined,
      to: newDevices,
    });

    this.offchainState.fields.sessions.update(deviceIdentifierHash, {
      from: undefined,
      to: UInt64.from(1),
    });
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
    await gameToken.approveAccountUpdate(accountUpdate);
    tokenBalance.assertGreaterThan(UInt64.zero);

    // TODO: getAndRequireEquals()
    const maxDeviceAllowed = gameToken.maxDeviceAllowed.get();
    deviceIndex.assertGreaterThan(UInt64.from(0));
    deviceIndex.assertLessThanOrEqual(maxDeviceAllowed);

    const deviceIdentifierHash = deviceProof.publicOutput;

    const currentState = await this.offchainState.fields.devices.get(
      userAddress
    );
    currentState.assertSome('User has not init devices');
    const prevDevices = currentState.value;

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

    const deletedDeviceLastSession =
      await this.offchainState.fields.sessions.get(deletedDevice);

    this.offchainState.fields.sessions.update(deletedDevice, {
      from: deletedDeviceLastSession,
      to: UInt64.from(0),
    });

    this.offchainState.fields.devices.update(userAddress, {
      from: prevDevices,
      to: newDevices,
    });

    const newDeviceLastSession = await this.offchainState.fields.sessions.get(
      deviceIdentifierHash
    );

    this.offchainState.fields.sessions.update(deviceIdentifierHash, {
      from: newDeviceLastSession,
      to: UInt64.from(1),
    });
  }

  @method
  async createSession(deviceSessionProof: DeviceSessionProof) {
    deviceSessionProof.verify();

    const gameTokenAddress = this.gameTokenAddress.getAndRequireEquals();
    deviceSessionProof.publicOutput.gameToken.assertEquals(gameTokenAddress);

    const deviceHash = deviceSessionProof.publicOutput.hash;

    const currentSessionKey = deviceSessionProof.publicInput.currentSessionKey;
    const newSessionKey = deviceSessionProof.publicOutput.newSessionKey;

    currentSessionKey.equals(newSessionKey).assertFalse();

    const fetchedSession = await this.offchainState.fields.sessions.get(
      deviceHash
    );
    fetchedSession.assertSome('Device session not found');

    fetchedSession.value.assertGreaterThanOrEqual(
      UInt64.from(1),
      'Current device is not active'
    );
    fetchedSession.value.assertEquals(currentSessionKey);

    fetchedSession.value
      .equals(newSessionKey)
      .assertFalse('New session key is the same as the current session key');

    this.offchainState.fields.sessions.update(deviceHash, {
      from: currentSessionKey,
      to: newSessionKey,
    });

    this.emitEvent(
      'Session',
      new SessionEvent({
        device: deviceHash,
        prev: currentSessionKey,
        current: newSessionKey,
      })
    );
  }
}

export class SessionEvent extends Struct({
  device: Field,
  prev: UInt64,
  current: UInt64,
}) {}
