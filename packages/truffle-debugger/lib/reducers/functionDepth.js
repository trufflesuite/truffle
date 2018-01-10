import * as actions from "../actions/functionDepth";

export default function reduce(state = 1, action) {
  if (action.type === actions.JUMP) {
    const delta = spelunk(action.jumpDirection)
    return state + delta;
  } else {
    return state;
  }
}

export function spelunk(jump) {
  if (jump == "i") {
    return 1;
  } else if (jump == "o") {
    return -1;
  } else {
    return 0;
  }
}

