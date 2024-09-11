import {
  AccountUpdate,
  Bool,
  method,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  UInt64,
} from 'o1js';
import {
  FungibleTokenAdminBase,
  FungibleTokenAdminDeployProps,
} from './index.js';

export class CustomTokenAdmin
  extends SmartContract
  implements FungibleTokenAdminBase
{
  @state(PublicKey)
  private adminPublicKey = State<PublicKey>();

  async deploy(props: FungibleTokenAdminDeployProps) {
    await super.deploy(props);
    this.adminPublicKey.set(props.adminPublicKey);
  }

  private ensureAdminSignature() {
    const admin = this.adminPublicKey.getAndRequireEquals();
    return AccountUpdate.createSigned(admin);
  }

  @method.returns(Bool)
  public async canMint(accountUpdate: AccountUpdate) {
    return accountUpdate.body.balanceChange.magnitude.lessThanOrEqual(
      UInt64.from(1)
    );
  }

  @method.returns(Bool)
  public async canChangeAdmin(_admin: PublicKey) {
    this.ensureAdminSignature();
    return Bool(true);
  }

  @method.returns(Bool)
  public async canPause(): Promise<Bool> {
    this.ensureAdminSignature();
    return Bool(true);
  }

  @method.returns(Bool)
  public async canResume(): Promise<Bool> {
    this.ensureAdminSignature();
    return Bool(true);
  }
}
