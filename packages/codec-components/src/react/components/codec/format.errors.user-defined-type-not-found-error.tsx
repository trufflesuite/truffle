import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { UserDefinedTypeNotFoundError } = createCodecComponent(
  "UserDefinedTypeNotFoundError",
  // TODO
  (data: Format.Errors.UserDefinedTypeNotFoundError) => <span>{data.kind}</span>
);
