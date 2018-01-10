import { TOCK } from "../actions/controller";

export default function reduce(state = 0, action) {
  if (action.type == TOCK) {
    return state + 1;
  } else {
    return state;
  }
}
