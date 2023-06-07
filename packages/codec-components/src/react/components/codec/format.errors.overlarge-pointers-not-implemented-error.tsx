import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { OverlargePointersNotImplementedError } = createCodecComponent(
  "OverlargePointersNotImplementedError",
  (data: Format.Errors.OverlargePointersNotImplementedError) => (
    // TODO
    <span>{data.pointerAsBN.toString()}</span>
  )
);
