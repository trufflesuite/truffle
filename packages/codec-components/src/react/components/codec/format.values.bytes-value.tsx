import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesStaticValue } from "./format.values.bytes-static-value";
import { BytesDynamicValue } from "./format.values.bytes-dynamic-value";
import { isBytesStaticValue } from "../../../utils";

export const { BytesValue } = createCodecComponent(
  "BytesValue",
  (data: Format.Values.BytesValue) =>
    isBytesStaticValue(data) ? (
      <BytesStaticValue data={data} />
    ) : (
      <BytesDynamicValue data={data} />
    )
);
