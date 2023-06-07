import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { UnsupportedConstantError } from "./format.errors.unsupported-constant-error";
import { ReadErrorStack } from "./format.errors.read-error-stack";
import { ReadErrorBytes } from "./format.errors.read-error-bytes";
import { ReadErrorStorage } from "./format.errors.read-error-storage";
import { StorageNotSuppliedError } from "./format.errors.storage-not-supplied-error";
import { UnusedImmutableError } from "./format.errors.unused-immutable-error";
import { CodeNotSuppliedError } from "./format.errors.code-not-supplied-error";
import {
  isUnsupportedConstantError,
  isReadErrorStack,
  isReadErrorBytes,
  isReadErrorStorage,
  isStorageNotSuppliedError,
  isUnusedImmutableError
} from "../../../utils";

export const { ReadError } = createCodecComponent(
  "ReadError",
  (data: Format.Errors.ReadError) =>
    isUnsupportedConstantError(data) ? (
      <UnsupportedConstantError data={data} />
    ) : isReadErrorStack(data) ? (
      <ReadErrorStack data={data} />
    ) : isReadErrorBytes(data) ? (
      <ReadErrorBytes data={data} />
    ) : isReadErrorStorage(data) ? (
      <ReadErrorStorage data={data} />
    ) : isStorageNotSuppliedError(data) ? (
      <StorageNotSuppliedError data={data} />
    ) : isUnusedImmutableError(data) ? (
      <UnusedImmutableError data={data} />
    ) : (
      <CodeNotSuppliedError data={data} />
    )
);
