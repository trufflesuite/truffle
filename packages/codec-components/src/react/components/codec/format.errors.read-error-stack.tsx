import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { ReadErrorStack } = createCodecComponent(
  "ReadErrorStack",
  ({ kind, from, to }: Format.Errors.ReadErrorStack) => (
    <CodecError kind={kind}>
      From {from} to {to}
    </CodecError>
  )
);
