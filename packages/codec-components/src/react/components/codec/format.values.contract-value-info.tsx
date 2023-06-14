import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractValueInfoKnown } from "./format.values.contract-value-info-known";
import { ContractValueInfoUnknown } from "./format.values.contract-value-info-unknown";
import { isContractValueInfoKnown } from "../../../utils";

export const { ContractValueInfo } = createCodecComponent(
  "ContractValueInfo",
  (data: Format.Values.ContractValueInfo) =>
    isContractValueInfoKnown(data) ? (
      <ContractValueInfoKnown data={data} />
    ) : (
      <ContractValueInfoUnknown data={data} />
    )
);
