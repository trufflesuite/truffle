import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { TupleValue } from "./format.values.tuple-value";
import { TupleErrorResult } from "./format.errors.tuple-error-result";
import { isTupleValue } from "../../../utils";

export const { TupleResult } = createCodecComponent(
  "TupleResult",
  (data: Format.Values.TupleResult) =>
    isTupleValue(data) ? (
      <TupleValue data={data} />
    ) : (
      <TupleErrorResult data={data} />
    )
);
