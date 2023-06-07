import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractValueInfo } from "./format.values.contract-value-info";

export const { ContractValue } = createCodecComponent(
  "ContractValue",
  ({ value }: Format.Values.ContractValue) => <ContractValueInfo data={value} />
);
