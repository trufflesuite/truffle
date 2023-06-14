import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { OverlongArraysAndStringsNotImplementedError } from "./format.errors.overlong-arrays-and-strings-not-implemented-error";
import { OverlargePointersNotImplementedError } from "./format.errors.overlarge-pointers-not-implemented-error";
import { isOverlongArraysAndStringsNotImplementedError } from "../../../utils";

export const { DynamicDataImplementationError } = createCodecComponent(
  "DynamicDataImplementationError",
  (data: Format.Errors.DynamicDataImplementationError) =>
    isOverlongArraysAndStringsNotImplementedError(data) ? (
      <OverlongArraysAndStringsNotImplementedError data={data} />
    ) : (
      <OverlargePointersNotImplementedError data={data} />
    )
);
