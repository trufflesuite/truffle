import Reducer from "./reducer";

export default class CallstackReducer extends Reducer {
  constructor(...args) {
    super(...args);
  }

  reduce(state = [], action) {
    const isCall = this.view.instruction.isCall(action.instruction);
    const isCreate = this.view.instruction.isCreate(action.instruction);
    const isHalting = this.view.instruction.isHalting(action.instruction);

    if (isCall) {
      const address = this.view.step.callAddress(action.step);
      return state + [ {address} ];

    } else if (isCreate) {
      const binary = step.createBinary();
      return state + [ {binary} ];

    } else if (isHalting) {
      return state.slice(0, -1); // pop
    } else {
      return state;
    }
  }

}
