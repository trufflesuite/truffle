import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { race, fork, take} from "redux-saga/effects";

import * as actions from "../actions";

import visitorSaga from "./visitor";

export default function* saga() {
  yield race({
    visitor: fork(visitorSaga),
    done: take(actions.DONE_VISITING)
  });
}
