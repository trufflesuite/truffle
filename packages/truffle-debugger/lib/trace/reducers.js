import { TOCK } from "../controller/actions";

export default function reduce(state = 0, action) {
  if (action.type == TOCK) {
    return state + 1;
  } else {
    return state;
  }
}
