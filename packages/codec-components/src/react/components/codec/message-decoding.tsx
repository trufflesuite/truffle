import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { MessageDecoding } = createCodecComponent(
  "MessageDecoding",
  (data: Codec.MessageDecoding) => {
    const empty = data.data === "0x" || data.data === "";
    return (
      <Container
        prefix={
          <>
            <Code type="contract">{data.class.typeName}</Code>
            <Code type="period">.</Code>
            {/* TODO */}
            <Code type="function">{data.abi?.type || "?"}</Code>
            <Code type="bracket">(</Code>
          </>
        }
        suffix={<Code type="bracket">)</Code>}
        empty={empty}
      >
        <Code type="bytes" title="type: bytes">
          {!empty && data.data}
        </Code>
      </Container>
    );
  }
);
