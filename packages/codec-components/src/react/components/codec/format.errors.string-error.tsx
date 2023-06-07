import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { DynamicDataImplementationError } from "./format.errors.dynamic-data-implementation-error";

export const { StringError } = createCodecComponent(
  "StringError",
  (data: Format.Errors.StringError) => (
    <DynamicDataImplementationError data={data} />
  )
);
