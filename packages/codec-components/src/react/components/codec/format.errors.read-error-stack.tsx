import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { ReadErrorStack } = createCodecComponent(
  "ReadErrorStack",
  (data: Format.Errors.ReadErrorStack) => (
    // TODO
    <span>
      {data.from} to {data.to}
    </span>
  )
);
