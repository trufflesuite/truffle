import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { OverlongArrayOrStringStrictModeError } from "./format.errors.overlong-array-or-string-strict-mode-error";
import { InternalFunctionInABIError } from "./format.errors.internal-function-in-abi-error";
import { ReEncodingMismatchError } from "./format.errors.re-encoding-mismatch-error";
import {
  isOverlongArrayOrStringStrictModeError,
  isInternalFunctionInABIError
} from "../../../utils";

export const { InternalUseError } = createCodecComponent(
  "InternalUseError",
  (data: Format.Errors.InternalUseError) =>
    isOverlongArrayOrStringStrictModeError(data) ? (
      <OverlongArrayOrStringStrictModeError data={data} />
    ) : isInternalFunctionInABIError(data) ? (
      <InternalFunctionInABIError data={data} />
    ) : (
      <ReEncodingMismatchError data={data} />
    )
);
