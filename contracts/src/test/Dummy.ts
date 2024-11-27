import { Field, method, SmartContract, state, State } from 'o1js';

export class DummyContract extends SmartContract {
  @state(Field) value = State<Field>();

  @method async setValue(value: Field) {
    this.value.set(value);
  }
}
