import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { IntValue } from "./format.values.int-value";
import { IntErrorResult } from "./format.errors.int-error-result";
import { isIntValue } from "../../../utils";

export const { IntResult } = createCodecComponent(
  "IntResult",
  (data: Format.Values.IntResult) =>
    isIntValue(data) ? <IntValue data={data} /> : <IntErrorResult data={data} />
);
