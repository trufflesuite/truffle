import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { CodeNotSuppliedError } = createCodecComponent(
  "CodeNotSuppliedError",
  // TODO
  (data: Format.Errors.CodeNotSuppliedError) => <span>{data.address}</span>
);
