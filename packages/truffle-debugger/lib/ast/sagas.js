import debugModule from "debug";
const debug = debugModule("debugger:ast:sagas");

import { takeEvery, call, fork, put, take, select } from "redux-saga/effects";
import ABI from "web3-eth-abi";

import { TICK } from "../trace/actions";
import * as actions from "./actions";

import ast from "./selectors";
import trace from "../trace/selectors";
import context from "../context/selectors";

import * as visitor from "./visitor";

export function* nodeSaga() {
  while (true) {
    yield take(TICK);

    let pointer = yield select(ast.next.pointer);
    let node = yield select(ast.next.node);
    let step = yield select(trace.step);
    let currentContext = yield select(context.current);

    debug("%s %s %s", pointer, node.nodeType, step.op);
    // // simple value assignment
    // if (node.nodeType == "Assignment" && step.op == "SSTORE") {
    //   debug("leftHandSide: %o", node.leftHandSide);
    //   debug("storage %O", step);

    //   let value = ABI.decodeParameter(
    //     node.leftHandSide.typeDescriptions.typeString,
    //     step.stack[step.stack.length - 2]
    //   );

    //   yield put(actions.assignStorage(
    //     currentContext.binary,
    //     node.leftHandSide.name,
    //     value
    //   ));
    // }
  }
}

export function* visitSaga({context, ast}) {
  yield *visitor.walk(context, ast);
}

export default function* saga() {
  yield fork(visitor.saga);

  yield takeEvery(actions.VISIT, visitSaga);
}
