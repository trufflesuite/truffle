import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractValue } from "./format.values.contract-value";
import { ContractErrorResult } from "./format.errors.contract-error-result";
import { isContractValue } from "../../../utils";

export const { ContractResult } = createCodecComponent(
  "ContractResult",
  (data: Format.Values.ContractResult) =>
    isContractValue(data) ? (
      <ContractValue data={data} />
    ) : (
      <ContractErrorResult data={data} />
    )
);
