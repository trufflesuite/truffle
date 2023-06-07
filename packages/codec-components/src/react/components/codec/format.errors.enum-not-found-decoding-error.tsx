import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { EnumNotFoundDecodingError } = createCodecComponent(
  "EnumNotFoundDecodingError",
  (data: Format.Errors.EnumNotFoundDecodingError) => (
    // TODO
    <span>{data.rawAsBN.toString()}</span>
  )
);
