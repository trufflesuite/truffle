import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

const [isTypeValueContract, , , typeValueContractGuards] =
  valueAndResultTypeGuardHelper<Format.Values.TypeValueContract, never, never>(
    data =>
      data.type.typeClass === "type" && data.type.type.typeClass === "contract"
  );

export { isTypeValueContract, typeValueContractGuards };
