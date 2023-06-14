import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { EnumError } from "./format.errors.enum-error";
import { GenericError } from "./format.errors.generic-error";
import { isEnumError } from "../../../utils";

export const { EnumErrorResult } = createCodecComponent(
  "EnumErrorResult",
  ({ error }: Format.Errors.EnumErrorResult) =>
    isEnumError(error) ? (
      <EnumError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
