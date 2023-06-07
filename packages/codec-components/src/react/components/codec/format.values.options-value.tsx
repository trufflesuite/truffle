import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Options } from "./options";

export const { OptionsValue } = createCodecComponent(
  "OptionsValue",
  ({ value }: Format.Values.OptionsValue) => <Options data={value} />
);
