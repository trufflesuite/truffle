import React from "react";
import type { Storage } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { StoragePosition } from "./format.storage.storage-position";
import { Code } from "../common/code";

export const { Range } = createCodecComponent(
  "Range",
  ({ from, length, to }: Storage.Range) => (
    <Code>
      From <StoragePosition data={from} />
      {to && (
        <>
          &nbsp;to <StoragePosition data={to} />
        </>
      )}
      {length && <> (length: {length})</>}
    </Code>
  )
);
