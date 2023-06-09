import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { EnumNotFoundDecodingError } = createCodecComponent(
  "EnumNotFoundDecodingError",
  ({ kind, type, rawAsBN }: Format.Errors.EnumNotFoundDecodingError) => (
    <CodecError kind={kind}>
      {type.typeName}.? ({rawAsBN.toString()})
    </CodecError>
  )
);
