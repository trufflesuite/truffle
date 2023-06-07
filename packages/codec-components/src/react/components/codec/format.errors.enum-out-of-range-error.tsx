import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { EnumOutOfRangeError } = createCodecComponent(
  "EnumOutOfRangeError",
  (data: Format.Errors.EnumOutOfRangeError) => (
    // TODO
    <span>{data.rawAsBN.toString()}</span>
  )
);
