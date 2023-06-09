import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { ContractPaddingError } = createCodecComponent(
  "ContractPaddingError",
  ({ kind, raw }: Format.Errors.ContractPaddingError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
