import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { ContractPaddingError } = createCodecComponent(
  "ContractPaddingError",
  // TODO
  (data: Format.Errors.ContractPaddingError) => <span>{data.raw}</span>
);
