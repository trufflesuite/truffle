import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { CodecError } from "../common/codec-error";

const kind = "BytesLocation";

export const { BytesLocation } = createCodecComponent(
  kind,
  (data: Format.Errors.BytesLocation) => (
    <CodecError kind={kind}>{data}</CodecError>
  )
);
