import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Range } from "./format.storage.range";
import { CodecError } from "../common/codec-error";

export const { ReadErrorStorage } = createCodecComponent(
  "ReadErrorStorage",
  ({ kind, range }: Format.Errors.ReadErrorStorage) => (
    <CodecError kind={kind}>
      <Range data={range} />
    </CodecError>
  )
);
