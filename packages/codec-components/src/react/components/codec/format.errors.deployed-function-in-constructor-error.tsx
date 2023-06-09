import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { DeployedFunctionInConstructorError } = createCodecComponent(
  "DeployedFunctionInConstructorError",
  ({ kind, context }: Format.Errors.DeployedFunctionInConstructorError) => (
    <CodecError kind={kind}>
      Deployed-style pointer in {context.typeName} constructor
    </CodecError>
  )
);
