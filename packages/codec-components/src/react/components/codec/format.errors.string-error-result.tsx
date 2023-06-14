import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { StringError } from "./format.errors.string-error";
import { GenericError } from "./format.errors.generic-error";
import { isStringError } from "../../../utils";

export const { StringErrorResult } = createCodecComponent(
  "StringErrorResult",
  ({ error }: Format.Errors.StringErrorResult) =>
    isStringError(error) ? (
      <StringError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
