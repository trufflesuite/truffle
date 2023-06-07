import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";
import { uintGuards } from "./uint";
import { intGuards } from "./int";
import { boolGuards } from "./bool";
import { bytesGuards } from "./bytes";
import { addressGuards } from "./address";
import { fixedGuards } from "./fixed";
import { ufixedGuards } from "./ufixed";
import { stringGuards } from "./string";
import { arrayGuards } from "./array";
import { functionExternalGuards } from "./function-external";
import { tupleGuards } from "./tuple";

export const [isAbiValue, isAbiErrorResult, isAbiResult, abiGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.AbiValue,
    Format.Errors.AbiErrorResult,
    Format.Values.AbiResult
  >(
    ...uintGuards,
    ...intGuards,
    ...boolGuards,
    ...bytesGuards,
    ...addressGuards,
    ...fixedGuards,
    ...ufixedGuards,
    ...stringGuards,
    ...arrayGuards,
    ...functionExternalGuards,
    ...tupleGuards
  );
