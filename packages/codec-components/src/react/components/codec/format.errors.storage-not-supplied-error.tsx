import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Code } from "../common/code";

export const { StorageNotSuppliedError } = createCodecComponent(
  "StorageNotSuppliedError",
  ({ kind, slot }: Format.Errors.StorageNotSuppliedError) => (
    <Code title={kind}>? (Slot {slot.toString()})</Code>
  )
);
