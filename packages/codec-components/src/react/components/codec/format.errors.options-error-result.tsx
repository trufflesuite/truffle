import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { OptionsError } from "./format.errors.options-error";
import { GenericError } from "./format.errors.generic-error";
import { isOptionsError } from "../../../utils";

export const { OptionsErrorResult } = createCodecComponent(
  "OptionsErrorResult",
  ({ error }: Format.Errors.OptionsErrorResult) =>
    isOptionsError(error) ? (
      <OptionsError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
