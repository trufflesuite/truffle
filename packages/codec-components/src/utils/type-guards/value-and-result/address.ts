import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

export const [
  isAddressValue,
  isAddressErrorResult,
  isAddressResult,
  addressGuards
] = valueAndResultTypeGuardHelper<
  Format.Values.AddressValue,
  Format.Errors.AddressErrorResult,
  Format.Values.AddressResult
>(data => data.type.typeClass === "address");
