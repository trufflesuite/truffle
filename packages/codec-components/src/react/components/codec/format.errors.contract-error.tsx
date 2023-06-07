import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractPaddingError } from "./format.errors.contract-padding-error";

export const { ContractError } = createCodecComponent(
  "ContractError",
  (data: Format.Errors.ContractError) => <ContractPaddingError data={data} />
);
