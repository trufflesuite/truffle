import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

export const { UserDefinedTypeNotFoundError } = createCodecComponent(
  "UserDefinedTypeNotFoundError",
  ({ kind, type }: Format.Errors.UserDefinedTypeNotFoundError) => (
    <CodecError kind={kind}>{type.typeName}</CodecError>
  )
);
