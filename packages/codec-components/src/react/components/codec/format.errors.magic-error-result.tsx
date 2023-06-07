import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { MagicError } from "./format.errors.magic-error";
import { GenericError } from "./format.errors.generic-error";
import { isMagicError } from "../../../utils";

export const { MagicErrorResult } = createCodecComponent(
  "MagicErrorResult",
  ({ error }: Format.Errors.MagicErrorResult) =>
    isMagicError(error) ? (
      <MagicError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
