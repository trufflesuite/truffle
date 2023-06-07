import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { NameValuePair } from "./format.values.name-value-pair";

export const { TypeValueContract } = createCodecComponent(
  "TypeValueContract",
  ({ value }: Format.Values.TypeValueContract) => (
    // TODO
    <>
      {value.map((nameValuePair, index) => (
        <NameValuePair data={nameValuePair} key={index} />
      ))}
    </>
  )
);
