import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { ReadErrorBytes } = createCodecComponent(
  "ReadErrorBytes",
  (data: Format.Errors.ReadErrorBytes) => (
    // TODO
    <span>
      {data.location}: {data.start} to {data.start + data.length}
    </span>
  )
);
