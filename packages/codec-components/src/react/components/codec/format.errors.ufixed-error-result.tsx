import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UfixedError } from "./format.errors.ufixed-error";
import { GenericError } from "./format.errors.generic-error";
import { isUfixedError } from "../../../utils";

export const { UfixedErrorResult } = createCodecComponent(
  "UfixedErrorResult",
  ({ error }: Format.Errors.UfixedErrorResult) =>
    isUfixedError(error) ? (
      <UfixedError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
