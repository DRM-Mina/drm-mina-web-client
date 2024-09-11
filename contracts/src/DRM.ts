import {
  PublicKey,
  SmartContract,
  State,
  method,
  state,
  Permissions,
  VerificationKey,
  Bool,
} from 'o1js';

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
