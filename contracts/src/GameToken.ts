import {
  AccountUpdate,
  AccountUpdateForest,
  Bool,
  DeployArgs,
  Int64,
  Permissions,
  Provable,
  PublicKey,
  State,
  Struct,
  TokenContractV2,
  Types,
  UInt64,
  VerificationKey,
  assert,
  method,
  state,
} from 'o1js';

interface GameTokenDeployProps extends Exclude<DeployArgs, undefined> {
  symbol: string;
  src: string;
}

export const GameTokenErrors = {
  noAdminKey: 'could not fetch admin contract key',
  noPermissionToChangeAdmin: 'Not allowed to change admin contract',
  tokenPaused: 'Token is currently paused',
  noPermissionToMint: 'Not allowed to mint tokens',
  noPermissionToPause: 'Not allowed to pause token',
  noPermissionToResume: 'Not allowed to resume token',
  noTransferFromCirculation: "Can't transfer to/from the circulation account",
  noPermissionChangeAllowed:
    "Can't change permissions for access or receive on token accounts",
  flashMinting:
    'Flash-minting or unbalanced transaction detected. Please make sure that your transaction is balanced, and that your `AccountUpdate`s are ordered properly, so that tokens are not received before they are sent.',
  unbalancedTransaction: 'Transaction is unbalanced',
};
export class GameToken extends TokenContractV2 {
  @state(PublicKey) publisher = State<PublicKey>();

  @state(UInt64) gamePrice = State<UInt64>();

  @state(UInt64) discount = State<UInt64>();

  @state(UInt64) timeoutInterval = State<UInt64>();

  @state(UInt64) maxDeviceAllowed = State<UInt64>();

  @state(Bool) paused = State<Bool>();

  readonly events = {
    SetAdmin: SetAdminEvent,
    Pause: PauseEvent,
    Mint: MintEvent,
    Burn: BurnEvent,
    BalanceChange: BalanceChangeEvent,
  };

  async deploy(props: GameTokenDeployProps) {
    await super.deploy(props);

    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proof(),
      send: Permissions.impossible(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proof(),
    });
  }

  @method
  async updateVerificationKey(vk: VerificationKey) {
    this.account.verificationKey.set(vk);
  }

  @method
  async initialize(
    publisher: PublicKey,
    gamePrice: UInt64,
    discount: UInt64,
    timeoutInterval: UInt64,
    maxDeviceAllowed: UInt64,
    startPaused: Bool
  ) {
    this.account.provedState.requireEquals(Bool(false));

    this.publisher.set(publisher);
    this.gamePrice.set(gamePrice);
    this.discount.set(discount);
    this.timeoutInterval.set(timeoutInterval);
    this.maxDeviceAllowed.set(maxDeviceAllowed);

    this.paused.set(Bool(false));
    this.paused.set(startPaused);

    const accountUpdate = AccountUpdate.createSigned(
      this.address,
      this.deriveTokenId()
    );
    let permissions = Permissions.default();
    // This is necessary in order to allow token holders to burn.
    permissions.send = Permissions.none();
    permissions.setPermissions = Permissions.impossible();
    accountUpdate.account.permissions.set(permissions);
  }

  @method.returns(AccountUpdate)
  async mintGameToken(recipient: PublicKey): Promise<AccountUpdate> {
    this.paused.getAndRequireEquals().assertFalse(GameTokenErrors.tokenPaused);
    const price = this.gamePrice.getAndRequireEquals();
    const discount = this.discount.getAndRequireEquals();
    const publisherAddress = this.publisher.getAndRequireEquals();
    const totalPrice = price.sub(discount);
    const mintAmount = UInt64.from(1);
    recipient
      .equals(this.address)
      .assertFalse(GameTokenErrors.noTransferFromCirculation);

    const mintFeeUpdate = AccountUpdate.createSigned(recipient);
    mintFeeUpdate.send({ to: publisherAddress, amount: totalPrice });

    const accountUpdate = this.internal.mint({
      address: recipient,
      amount: mintAmount,
    });
    this.approve(accountUpdate);

    this.emitEvent('Mint', new MintEvent({ recipient, amount: mintAmount }));
    const circulationUpdate = AccountUpdate.create(
      this.address,
      this.deriveTokenId()
    );
    circulationUpdate.balanceChange = Int64.fromUnsigned(mintAmount);

    return accountUpdate;
  }

  @method
  async pause() {
    this.onlyPublisher();
    this.paused.set(Bool(true));
    this.emitEvent('Pause', new PauseEvent({ isPaused: Bool(true) }));
  }

  @method
  async resume() {
    this.onlyPublisher();
    this.paused.set(Bool(false));
    this.emitEvent('Pause', new PauseEvent({ isPaused: Bool(false) }));
  }

  @method
  async setGamePrice(price: UInt64) {
    this.onlyPublisher();
    this.gamePrice.getAndRequireEquals();
    this.gamePrice.set(price);
  }

  @method
  async setDiscount(discount: UInt64) {
    this.onlyPublisher();
    this.discount.getAndRequireEquals();
    this.discount.set(discount);
  }

  @method
  async setTimeoutInterval(interval: UInt64) {
    this.onlyPublisher();
    this.timeoutInterval.getAndRequireEquals();
    this.timeoutInterval.set(interval);
  }

  @method
  async setMaxDeviceAllowed(height: UInt64) {
    this.onlyPublisher();
    this.maxDeviceAllowed.getAndRequireEquals();
    this.maxDeviceAllowed.set(height);
  }

  @method
  async setPublisher(publisher: PublicKey) {
    this.onlyPublisher();
    this.publisher.getAndRequireEquals();
    this.publisher.set(publisher);
  }

  @method
  async setBulk(
    publisher: PublicKey,
    price: UInt64,
    discount: UInt64,
    timeoutInterval: UInt64,
    maxDeviceAllowed: UInt64
  ) {
    this.onlyPublisher();
    this.publisher.getAndRequireEquals();
    this.gamePrice.getAndRequireEquals();
    this.discount.getAndRequireEquals();
    this.timeoutInterval.getAndRequireEquals();
    this.maxDeviceAllowed.getAndRequireEquals();
    this.publisher.set(publisher);
    this.gamePrice.set(price);
    this.discount.set(discount);
    this.timeoutInterval.set(timeoutInterval);
    this.maxDeviceAllowed.set(maxDeviceAllowed);
  }

  private onlyPublisher() {
    const publisher = this.publisher.getAndRequireEquals();
    AccountUpdate.create(publisher).requireSignature();
  }

  private async ensureAdminSignature() {
    const admin = await Provable.witnessAsync(PublicKey, async () => {
      let pk = await this.publisher.fetch();
      assert(pk !== undefined, 'could not fetch admin public key');
      return pk;
    });
    this.publisher.requireEquals(admin);
    return AccountUpdate.createSigned(admin);
  }

  private checkPermissionsUpdate(update: AccountUpdate) {
    let permissions = update.update.permissions;

    let { access, receive } = permissions.value;
    let accessIsNone = Provable.equal(
      Types.AuthRequired,
      access,
      Permissions.none()
    );
    let receiveIsNone = Provable.equal(
      Types.AuthRequired,
      receive,
      Permissions.none()
    );
    let updateAllowed = accessIsNone.and(receiveIsNone);

    assert(
      updateAllowed.or(permissions.isSome.not()),
      GameTokenErrors.noPermissionChangeAllowed
    );
  }

  @method
  async approveBase(updates: AccountUpdateForest): Promise<void> {
    this.paused.getAndRequireEquals().assertFalse(GameTokenErrors.tokenPaused);
    let totalBalance = Int64.from(0);
    this.forEachUpdate(updates, (update, usesToken) => {
      // Make sure that the account permissions are not changed
      this.checkPermissionsUpdate(update);
      this.emitEventIf(
        usesToken,
        'BalanceChange',
        new BalanceChangeEvent({
          address: update.publicKey,
          amount: update.balanceChange,
        })
      );
      // Don't allow transfers to/from the account that's tracking circulation
      update.publicKey
        .equals(this.address)
        .and(usesToken)
        .assertFalse(GameTokenErrors.noTransferFromCirculation);
      totalBalance = Provable.if(
        usesToken,
        totalBalance.add(update.balanceChange),
        totalBalance
      );
      totalBalance.isPositiveV2().assertFalse(GameTokenErrors.flashMinting);
    });
    totalBalance.assertEquals(
      Int64.zero,
      GameTokenErrors.unbalancedTransaction
    );
  }

  @method.returns(UInt64)
  async getBalanceOf(address: PublicKey): Promise<UInt64> {
    const account = AccountUpdate.create(address, this.deriveTokenId()).account;
    const balance = account.balance.get();
    account.balance.requireEquals(balance);
    return balance;
  }

  async getCirculating(): Promise<UInt64> {
    let circulating = await this.getBalanceOf(this.address);
    return circulating;
  }
}

export class SetAdminEvent extends Struct({
  adminKey: PublicKey,
}) {}

export class PauseEvent extends Struct({
  isPaused: Bool,
}) {}

export class MintEvent extends Struct({
  recipient: PublicKey,
  amount: UInt64,
}) {}

export class BurnEvent extends Struct({
  from: PublicKey,
  amount: UInt64,
}) {}

export class BalanceChangeEvent extends Struct({
  address: PublicKey,
  amount: Int64,
}) {}
