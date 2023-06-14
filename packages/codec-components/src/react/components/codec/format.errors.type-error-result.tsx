import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { TypeErrorUnion } from "./format.errors.type-error-union";
import { GenericError } from "./format.errors.generic-error";
import { isTypeErrorUnion } from "../../../utils";

export const { TypeErrorResult } = createCodecComponent(
  "TypeErrorResult",
  ({ error }: Format.Errors.TypeErrorResult) =>
    isTypeErrorUnion(error) ? (
      <TypeErrorUnion data={error} />
    ) : (
      <GenericError data={error} />
    )
);
