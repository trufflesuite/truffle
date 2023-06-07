import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { isStringValueInfoValid } from "../../../utils";
import { StringValueInfoValid } from "./format.values.string-value-info-valid";
import { StringValueInfoMalformed } from "./format.values.string-value-info-malformed";

export const { StringValueInfo } = createCodecComponent(
  "StringValueInfo",
  (data: Format.Values.StringValueInfo) =>
    isStringValueInfoValid(data) ? (
      <StringValueInfoValid data={data} />
    ) : (
      <StringValueInfoMalformed data={data} />
    )
);
