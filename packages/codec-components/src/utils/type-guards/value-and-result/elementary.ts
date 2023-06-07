import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";
import { uintGuards } from "./uint";
import { intGuards } from "./int";
import { boolGuards } from "./bool";
import { bytesGuards } from "./bytes";
import { addressGuards } from "./address";
import { stringGuards } from "./string";
import { fixedGuards } from "./fixed";
import { ufixedGuards } from "./ufixed";
import { enumGuards } from "./enum";
import { userDefinedValueTypeGuards } from "./user-defined-value-type";
import { contractGuards } from "./contract";

export const [
  isElementaryValue,
  isElementaryErrorResult,
  isElementaryResult,
  elementaryGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.ElementaryValue,
  Format.Errors.ElementaryErrorResult,
  Format.Values.ElementaryResult
>(
  ...uintGuards,
  ...intGuards,
  ...boolGuards,
  ...bytesGuards,
  ...addressGuards,
  ...stringGuards,
  ...fixedGuards,
  ...ufixedGuards,
  ...enumGuards,
  ...userDefinedValueTypeGuards,
  ...contractGuards
);
