import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { MappingError } from "./format.errors.mapping-error";
import { GenericError } from "./format.errors.generic-error";
import { isMappingError } from "../../../utils";

export const { MappingErrorResult } = createCodecComponent(
  "MappingErrorResult",
  ({ error }: Format.Errors.MappingErrorResult) =>
    isMappingError(error) ? (
      <MappingError data={error} />
    ) : (
      <GenericError data={error} />
    )
);
