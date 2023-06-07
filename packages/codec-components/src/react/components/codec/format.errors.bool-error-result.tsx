import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BoolError } from "./format.errors.bool-error";
import { GenericError } from "./format.errors.generic-error";
import { isBoolError } from "../../../utils";

export const { BoolErrorResult } = createCodecComponent(
  "BoolErrorResult",
  ({ error }: Format.Errors.BoolErrorResult) =>
    isBoolError(error) ? (
      <BoolError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
