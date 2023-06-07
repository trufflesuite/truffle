import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesStaticError } from "./format.errors.bytes-static-error";
import { GenericError } from "./format.errors.generic-error";
import { isBytesStaticError } from "../../../utils";

export const { BytesStaticErrorResult } = createCodecComponent(
  "BytesStaticErrorResult",
  ({ error }: Format.Errors.BytesStaticErrorResult) =>
    isBytesStaticError(error) ? (
      <BytesStaticError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
