import Reducer from "./reducer";

export default class FunctionDepthReducer extends Reducer {
  constructor(...args) {
    super(...args);
  }

  reduce(state = 1, action) {
    if (this.view.instruction.isJump(action.instruction)) {
      const delta = spelunk(action.instruction.jump);
      return state + delta;
    } else {
      return state;
    }
  }
}

function spelunk(jump) {
  if (jump == "i") {
    return 1;
  } else if (jump == "o") {
    return -1;
  } else {
    return 0;
  }
}

