import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { StructError } from "./format.errors.struct-error";
import { GenericError } from "./format.errors.generic-error";
import { isStructError } from "../../../utils";

export const { StructErrorResult } = createCodecComponent(
  "StructErrorResult",
  ({ error }: Format.Errors.StructErrorResult) =>
    isStructError(error) ? (
      <StructError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
