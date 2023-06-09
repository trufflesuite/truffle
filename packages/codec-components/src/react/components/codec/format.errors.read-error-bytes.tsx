import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { ReadErrorBytes } = createCodecComponent(
  "ReadErrorBytes",
  ({ kind, start, length, location }: Format.Errors.ReadErrorBytes) => (
    <CodecError kind={kind}>
      From {start} to {start + length} ({location})
    </CodecError>
  )
);
