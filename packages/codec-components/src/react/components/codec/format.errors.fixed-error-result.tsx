import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FixedError } from "./format.errors.fixed-error";
import { GenericError } from "./format.errors.generic-error";
import { isFixedError } from "../../../utils";

export const { FixedErrorResult } = createCodecComponent(
  "FixedErrorResult",
  ({ error }: Format.Errors.FixedErrorResult) =>
    isFixedError(error) ? (
      <FixedError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
