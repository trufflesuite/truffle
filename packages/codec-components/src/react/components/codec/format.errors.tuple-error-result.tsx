import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { TupleError } from "./format.errors.tuple-error";
import { GenericError } from "./format.errors.generic-error";
import { isTupleError } from "../../../utils";

export const { TupleErrorResult } = createCodecComponent(
  "TupleErrorResult",
  ({ error }: Format.Errors.TupleErrorResult) =>
    isTupleError(error) ? (
      <TupleError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
