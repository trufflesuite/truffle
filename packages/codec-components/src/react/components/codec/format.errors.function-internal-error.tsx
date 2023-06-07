import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { FunctionInternalPaddingError } from "./format.errors.function-internal-padding-error";
import { NoSuchInternalFunctionError } from "./format.errors.no-such-internal-function-error";
import { DeployedFunctionInConstructorError } from "./format.errors.deployed-function-in-constructor-error";
import { MalformedInternalFunctionError } from "./format.errors.malformed-internal-function-error";
import {
  isFunctionInternalPaddingError,
  isNoSuchInternalFunctionError,
  isDeployedFunctionInConstructorError
} from "../../../utils";

export const { FunctionInternalError } = createCodecComponent(
  "FunctionInternalError",
  (data: Format.Errors.FunctionInternalError) =>
    isFunctionInternalPaddingError(data) ? (
      <FunctionInternalPaddingError data={data} />
    ) : isNoSuchInternalFunctionError(data) ? (
      <NoSuchInternalFunctionError data={data} />
    ) : isDeployedFunctionInConstructorError(data) ? (
      <DeployedFunctionInConstructorError data={data} />
    ) : (
      <MalformedInternalFunctionError data={data} />
    )
);
