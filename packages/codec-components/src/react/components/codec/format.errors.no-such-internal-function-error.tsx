import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";
import { FunctionInternalRawInfo } from "./format.values.function-internal-raw-info";

export const { NoSuchInternalFunctionError } = createCodecComponent(
  "NoSuchInternalFunctionError",
  ({
    kind,
    context,
    rawInformation
  }: Format.Errors.NoSuchInternalFunctionError) => (
    <CodecError kind={kind}>
      {context.typeName} function pointer does not point to a valid function
      <FunctionInternalRawInfo data={rawInformation} />
    </CodecError>
  )
);
