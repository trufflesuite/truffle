import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { MalformedInternalFunctionError } = createCodecComponent(
  "MalformedInternalFunctionError",
  ({
    kind,
    context,
    constructorProgramCounter
  }: Format.Errors.MalformedInternalFunctionError) => (
    <CodecError kind={kind}>
      {context.typeName} constructor program counter is nonzero (
      {constructorProgramCounter})
    </CodecError>
  )
);
