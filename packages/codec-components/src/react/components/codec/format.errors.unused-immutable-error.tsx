import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { UnusedImmutableError } = createCodecComponent(
  "UnusedImmutableError",
  // TODO
  (data: Format.Errors.UnusedImmutableError) => <span>{data.kind}</span>
);
