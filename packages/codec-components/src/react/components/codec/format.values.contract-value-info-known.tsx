import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { ContractValueInfoKnown } = createCodecComponent(
  "ContractValueInfoKnown",
  // TODO
  (data: Format.Values.ContractValueInfoKnown) => <span>{data.address}</span>
);
