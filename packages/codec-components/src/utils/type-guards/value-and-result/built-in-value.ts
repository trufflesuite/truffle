import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";
import { uintGuards } from "./uint";
import { intGuards } from "./int";
import { boolGuards } from "./bool";
import { bytesStaticGuards } from "./bytes-static";
import { addressGuards } from "./address";
import { fixedGuards } from "./fixed";
import { ufixedGuards } from "./ufixed";

const [isBuiltInValueValue, isBuiltInValueErrorResult, , builtInValueGuards] =
  valueAndResultTypeGuardHelper<
    Format.Values.BuiltInValueValue,
    Format.Errors.BuiltInValueErrorResult,
    never
  >(
    ...uintGuards,
    ...intGuards,
    ...boolGuards,
    ...bytesStaticGuards,
    ...addressGuards,
    ...fixedGuards,
    ...ufixedGuards
  );

export { isBuiltInValueValue, isBuiltInValueErrorResult, builtInValueGuards };
