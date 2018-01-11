import { all, call, fork, race, take } from 'redux-saga/effects';

import controllerSaga from "./controller/sagas";
import soliditySaga from "./solidity/sagas";
import evmSaga from "./evm/sagas";
import traceSaga from "./trace/sagas";


import { END_OF_TRACE } from "./trace/actions";

export function* sessionSaga() {
  yield fork(controllerSaga);
  yield fork(traceSaga);
  yield fork(evmSaga);
  yield fork(soliditySaga);
}

export default function *rootSaga () {
  yield race({
    session: call(sessionSaga),

    cancel: take(END_OF_TRACE)
  });
}
