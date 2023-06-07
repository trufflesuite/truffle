import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { BytesPaddingError } = createCodecComponent(
  "BytesPaddingError",
  // TODO
  (data: Format.Errors.BytesPaddingError) => <span>{data.raw}</span>
);
