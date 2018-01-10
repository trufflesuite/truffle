import { all, call, fork, race, take } from 'redux-saga/effects';

import controllerSaga from "./controller/sagas";
import soliditySaga from "./solidity/sagas";
import evmSaga from "./evm/sagas";

import { END_OF_TRACE } from "./controller/actions";

export function* sessionSaga() {
  yield fork(controllerSaga);
  yield fork(soliditySaga);
  yield fork(evmSaga);
}

export default function *rootSaga () {
  yield race({
    session: call(sessionSaga),

    cancel: take(END_OF_TRACE)
  });
}
