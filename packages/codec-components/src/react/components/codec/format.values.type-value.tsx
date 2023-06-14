import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { TypeValueContract } from "./format.values.type-value-contract";
import { TypeValueEnum } from "./format.values.type-value-enum";
import { isTypeValueContract } from "../../../utils";

export const { TypeValue } = createCodecComponent(
  "TypeValue",
  (data: Format.Values.TypeValue) =>
    isTypeValueContract(data) ? (
      <TypeValueContract data={data} />
    ) : (
      <TypeValueEnum data={data} />
    )
);
