import React from "react";
import type { Storage } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Slot } from "./format.storage.slot";
import { Code } from "../common/code";

export const { StoragePosition } = createCodecComponent(
  "StoragePosition",
  ({ index, slot }: Storage.StoragePosition) => (
    <Code>
      {index}: <Slot data={slot} />
    </Code>
  )
);
