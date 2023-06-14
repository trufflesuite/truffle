import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { NoSuchInternalFunctionError } = createCodecComponent(
  "NoSuchInternalFunctionError",
  ({
    kind,
    context,
    constructorProgramCounter,
    deployedProgramCounter
  }: Format.Errors.NoSuchInternalFunctionError) => (
    <CodecError kind={kind}>
      {context.typeName} function pointer does not point to a valid function
      (constructor program counter: {constructorProgramCounter}, deployed
      program counter: {deployedProgramCounter})
    </CodecError>
  )
);
