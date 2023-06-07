import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { WrappedError } from "./format.errors.wrapped-error";

export const { UserDefinedValueTypeError } = createCodecComponent(
  "UserDefinedValueTypeError",
  (data: Format.Errors.UserDefinedValueTypeError) => (
    <WrappedError data={data} />
  )
);
