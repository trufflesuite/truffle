import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UintError } from "./format.errors.uint-error";
import { GenericError } from "./format.errors.generic-error";
import { isUintError } from "../../../utils";

export const { UintErrorResult } = createCodecComponent(
  "UintErrorResult",
  ({ error }: Format.Errors.UintErrorResult) =>
    isUintError(error) ? (
      <UintError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
