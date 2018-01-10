import debugModule from "debug";
const debug = debugModule("debugger:effects");

import { select } from "redux-saga/effects";

import { createSelector, createStructuredSelector } from "reselect";

export function view(selector) {
  return select(({ state, props }) => {

    debug("state: %O", state);
    return selector(state, props);
  });
}
