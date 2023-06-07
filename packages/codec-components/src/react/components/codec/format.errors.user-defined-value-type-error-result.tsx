import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UserDefinedValueTypeError } from "./format.errors.user-defined-value-type-error";
import { GenericError } from "./format.errors.generic-error";
import { isUserDefinedValueTypeError } from "../../../utils";

export const { UserDefinedValueTypeErrorResult } = createCodecComponent(
  "UserDefinedValueTypeErrorResult",
  ({ error }: Format.Errors.UserDefinedValueTypeErrorResult) =>
    isUserDefinedValueTypeError(error) ? (
      <UserDefinedValueTypeError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
