import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UserDefinedTypeNotFoundError } from "./format.errors.user-defined-type-not-found-error";
import { ReadError } from "./format.errors.read-error";
import { isUserDefinedTypeNotFoundError } from "../../../utils";

export const { ErrorForThrowing } = createCodecComponent(
  "ErrorForThrowing",
  (data: Format.Errors.ErrorForThrowing) =>
    isUserDefinedTypeNotFoundError(data) ? (
      <UserDefinedTypeNotFoundError data={data} />
    ) : (
      <ReadError data={data} />
    )
);
