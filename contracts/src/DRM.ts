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
} from 'o1js';

export class Devices extends Struct({
  device_1: Field,
  device_2: Field,
  device_3: Field,
  device_4: Field,
}) {}

export class DeviceKey extends Struct({
  gameId: UInt64,
  address: PublicKey,
}) {
  public static from(gameId: UInt64, address: PublicKey) {
    return new DeviceKey({ gameId, address });
  }
}

export class SessionKey extends Struct({
  gameId: UInt64,
  identifierHash: Field,
}) {
  public static from(gameId: UInt64, identifierHash: Field) {
    return new SessionKey({ gameId, identifierHash });
  }
}

export class DRM extends SmartContract {
  @state(PublicKey) gameTokenAddress = State<PublicKey>();

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
}
