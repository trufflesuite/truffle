import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ArrayError } from "./format.errors.array-error";
import { GenericError } from "./format.errors.generic-error";
import { isArrayError } from "../../../utils";

export const { ArrayErrorResult } = createCodecComponent(
  "ArrayErrorResult",
  ({ error }: Format.Errors.ArrayErrorResult) =>
    isArrayError(error) ? (
      <ArrayError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
