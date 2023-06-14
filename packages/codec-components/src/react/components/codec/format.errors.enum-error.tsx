import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { EnumOutOfRangeError } from "./format.errors.enum-out-of-range-error";
import { EnumPaddingError } from "./format.errors.enum-padding-error";
import { EnumNotFoundDecodingError } from "./format.errors.enum-not-found-decoding-error";
import { isEnumOutOfRangeError, isEnumPaddingError } from "../../../utils";

export const { EnumError } = createCodecComponent(
  "EnumError",
  (data: Format.Errors.EnumError) =>
    isEnumOutOfRangeError(data) ? (
      <EnumOutOfRangeError data={data} />
    ) : isEnumPaddingError(data) ? (
      <EnumPaddingError data={data} />
    ) : (
      <EnumNotFoundDecodingError data={data} />
    )
);
