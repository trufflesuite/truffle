import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Result } from "./format.values.result";

export const { MagicValue } = createCodecComponent(
  "MagicValue",
  ({ value }: Format.Values.MagicValue) => (
    // TODO
    <>
      {Object.values(value).map((result, index) => (
        <Result data={result} key={index} />
      ))}
    </>
  )
);
