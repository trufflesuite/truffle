import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ContractError } from "./format.errors.contract-error";
import { GenericError } from "./format.errors.generic-error";
import { isContractError } from "../../../utils";

export const { ContractErrorResult } = createCodecComponent(
  "ContractErrorResult",
  ({ error }: Format.Errors.ContractErrorResult) =>
    isContractError(error) ? (
      <ContractError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
