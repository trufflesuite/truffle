import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { BytesPaddingError } from "./format.errors.bytes-padding-error";

export const { BytesStaticError } = createCodecComponent(
  "BytesStaticError",
  (data: Format.Errors.BytesStaticError) => <BytesPaddingError data={data} />
);
