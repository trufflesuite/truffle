import { all, call, fork, race, take } from 'redux-saga/effects';

import controllerSaga from "../controller/sagas";
import functionDepthSaga from "./functionDepth";
import callstackSaga from "./callstack";

import { END_OF_TRACE } from "../controller/actions";

export function* sessionSaga() {
  yield fork(controllerSaga);
  yield fork(functionDepthSaga);
  yield fork(callstackSaga);
}

export default function *rootSaga () {
  yield race({
    session: call(sessionSaga),

    cancel: take(END_OF_TRACE)
  });
}
