import Reducer from "./reducer";

export default class TraceIndexReducer extends Reducer {
  constructor(...args) {
    super(...args);
  }

  reduce(state = 0, action) {
    return state + 1;
  }
}
