import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BoolOutOfRangeError } from "./format.errors.bool-out-of-range-error";
import { BoolPaddingError } from "./format.errors.bool-padding-error";
import { isBoolOutOfRangeError } from "../../../utils";

export const { BoolError } = createCodecComponent(
  "BoolError",
  (data: Format.Errors.BoolError) =>
    isBoolOutOfRangeError(data) ? (
      <BoolOutOfRangeError data={data} />
    ) : (
      <BoolPaddingError data={data} />
    )
);
