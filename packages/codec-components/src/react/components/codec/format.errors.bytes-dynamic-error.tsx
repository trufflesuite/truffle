import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { DynamicDataImplementationError } from "./format.errors.dynamic-data-implementation-error";

export const { BytesDynamicError } = createCodecComponent(
  "BytesDynamicError",
  (data: Format.Errors.BytesDynamicError) => (
    <DynamicDataImplementationError data={data} />
  )
);
