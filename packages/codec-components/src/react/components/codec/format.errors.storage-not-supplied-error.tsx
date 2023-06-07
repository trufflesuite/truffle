import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";

export const { StorageNotSuppliedError } = createCodecComponent(
  "StorageNotSuppliedError",
  (data: Format.Errors.StorageNotSuppliedError) => (
    // TODO
    <span>{data.slot.toString()}</span>
  )
);
