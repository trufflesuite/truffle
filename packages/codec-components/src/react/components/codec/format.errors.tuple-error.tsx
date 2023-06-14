import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { DynamicDataImplementationError } from "./format.errors.dynamic-data-implementation-error";

export const { TupleError } = createCodecComponent(
  "TupleError",
  (data: Format.Errors.TupleError) => (
    <DynamicDataImplementationError data={data} />
  )
);
