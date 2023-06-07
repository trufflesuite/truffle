import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UserDefinedValueTypeValue } from "./format.values.user-defined-value-type-value";
import { UserDefinedValueTypeErrorResult } from "./format.errors.user-defined-value-type-error-result";
import { isUserDefinedValueTypeValue } from "../../../utils";

export const { UserDefinedValueTypeResult } = createCodecComponent(
  "UserDefinedValueTypeResult",
  (data: Format.Values.UserDefinedValueTypeResult) =>
    isUserDefinedValueTypeValue(data) ? (
      <UserDefinedValueTypeValue data={data} />
    ) : (
      <UserDefinedValueTypeErrorResult data={data} />
    )
);
