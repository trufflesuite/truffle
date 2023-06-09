import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { EnumOutOfRangeError } = createCodecComponent(
  "EnumOutOfRangeError",
  ({ kind, type, rawAsBN }: Format.Errors.EnumOutOfRangeError) => (
    <CodecError kind={kind}>
      {type.typeName}.? ({rawAsBN.toString()})
    </CodecError>
  )
);
