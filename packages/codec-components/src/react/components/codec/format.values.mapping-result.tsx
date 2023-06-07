import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { MappingValue } from "./format.values.mapping-value";
import { MappingErrorResult } from "./format.errors.mapping-error-result";
import { isMappingValue } from "../../../utils";

export const { MappingResult } = createCodecComponent(
  "MappingResult",
  (data: Format.Values.MappingResult) =>
    isMappingValue(data) ? (
      <MappingValue data={data} />
    ) : (
      <MappingErrorResult data={data} />
    )
);
