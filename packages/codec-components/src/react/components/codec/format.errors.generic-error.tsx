import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UserDefinedTypeNotFoundError } from "./format.errors.user-defined-type-not-found-error";
import { IndexedReferenceTypeError } from "./format.errors.indexed-reference-type-error";
import { ReadError } from "./format.errors.read-error";
import {
  isUserDefinedTypeNotFoundError,
  isIndexedReferenceTypeError
} from "../../../utils";

export const { GenericError } = createCodecComponent(
  "GenericError",
  (data: Format.Errors.GenericError) =>
    isUserDefinedTypeNotFoundError(data) ? (
      <UserDefinedTypeNotFoundError data={data} />
    ) : isIndexedReferenceTypeError(data) ? (
      <IndexedReferenceTypeError data={data} />
    ) : (
      <ReadError data={data} />
    )
);
