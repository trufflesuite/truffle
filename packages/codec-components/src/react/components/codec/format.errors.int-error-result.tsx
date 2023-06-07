import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { IntError } from "./format.errors.int-error";
import { GenericError } from "./format.errors.generic-error";
import { isIntError } from "../../../utils";

export const { IntErrorResult } = createCodecComponent(
  "IntErrorResult",
  ({ error }: Format.Errors.IntErrorResult) =>
    isIntError(error) ? (
      <IntError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
