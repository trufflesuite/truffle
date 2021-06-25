import debugModule from "debug";
const debug = debugModule("codec:wrap:dispatch");

import * as Format from "@truffle/codec/format";
import { TypeMismatchError } from "./errors";
import type { WrapRequest, WrapResponse } from "../types";
import type { Case, WrapOptions } from "./types";

export function* wrapWithCases<
  TypeType extends Format.Types.Type,
  ValueType,
  RequestType
>(
  dataType: TypeType,
  input: unknown,
  wrapOptions: WrapOptions,
  cases: Case<TypeType, ValueType, RequestType>[]
): Generator<RequestType, ValueType, WrapResponse> {
  let bestError: TypeMismatchError;
  const specificityFloor = wrapOptions.specificityFloor || 0;
  for (const caseFn of cases) {
    try {
      return yield* caseFn(
        dataType,
        input,
        { ...wrapOptions, specificityFloor: 0 } //do not propagate specificityFloor!
      );
    } catch (error) {
      if (!(error instanceof TypeMismatchError)) {
        //rethrow unexpected errors
        throw error;
      } else if (!bestError || error.specificity > bestError.specificity) {
        bestError = error;
      }
    }
  }
  //if we've made it this far, no case has matched
  if (bestError && bestError.specificity < specificityFloor) {
    bestError.specificity = specificityFloor; //mutating this should be fine, right?
  }
  throw bestError || new TypeMismatchError( //last-resort error
    dataType,
    input,
    wrapOptions.name,
    specificityFloor, //it doesn't matter, but we'll make this error lowest specificity
    `Input for ${wrapOptions.name} was not recognizable as type ${Format.Types.typeStringWithoutLocation(dataType)}`
  );
  //(note: we don't actually want to rely on the last-resort error, we'll
  //instead prefer last-resort cases that just throw an error so we can get
  //more specific messages, but I'm including this anyway just to be certain)
}
