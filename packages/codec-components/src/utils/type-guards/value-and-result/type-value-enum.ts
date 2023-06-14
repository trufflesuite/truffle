import type { Format } from "@truffle/codec";
import { valueAndResultTypeGuardHelper } from "./helper";

const [isTypeValueEnum, , , typeValueEnumGuards] =
  valueAndResultTypeGuardHelper<Format.Values.TypeValueEnum, never, never>(
    data =>
      data.type.typeClass === "type" && data.type.type.typeClass === "enum"
  );

export { isTypeValueEnum, typeValueEnumGuards };
