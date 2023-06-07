import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesDynamicError } from "./format.errors.bytes-dynamic-error";
import { GenericError } from "./format.errors.generic-error";
import { isBytesDynamicError } from "../../../utils";

export const { BytesDynamicErrorResult } = createCodecComponent(
  "BytesDynamicErrorResult",
  ({ error }: Format.Errors.BytesDynamicErrorResult) =>
    isBytesDynamicError(error) ? (
      <BytesDynamicError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
