import React from "react";
import type { Storage } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ElementaryValue } from "./format.values.elementary-value";
import { Code } from "../common/code";
import { typeString } from "../../../utils";

export const { Slot } = createCodecComponent(
  "Slot",
  ({ key, path, hashPath, offset }: Storage.Slot) => {
    return key && path ? (
      <Code>
        keccak(
        <ElementaryValue data={key} /> as {typeString(key.type)},&nbsp;
        <Slot data={path} />) + {offset.toString()}
      </Code>
    ) : path ? (
      <Code>
        {hashPath ? (
          <>
            keccak(
            <Slot data={path} />)
          </>
        ) : (
          <Slot data={path} />
        )}
        &nbsp;+ {offset.toString()}
      </Code>
    ) : (
      <Code>{offset.toString()}</Code>
    );
  }
);
