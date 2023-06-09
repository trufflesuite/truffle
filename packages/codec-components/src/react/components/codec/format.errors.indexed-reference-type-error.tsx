import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { IndexedReferenceTypeError } = createCodecComponent(
  "IndexedReferenceTypeError",
  ({ kind, raw }: Format.Errors.IndexedReferenceTypeError) => (
    <CodecError kind={kind}>{raw}</CodecError>
  )
);
