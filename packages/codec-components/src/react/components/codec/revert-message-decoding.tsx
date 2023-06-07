import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { NextBracketDepth } from "../providers/next-bracket-depth";
import { Container } from "../common/container";
import { Code } from "../common/code";
import { AbiArguments } from "../common/abi-arguments";

export const { RevertMessageDecoding } = createCodecComponent(
  "RevertMessageDecoding",
  (data: Codec.RevertMessageDecoding) => {
    return (
      <Container
        prefix={
          <>
            <Code type="revert-keyword">revert&nbsp;</Code>
            <Code type="error">{data.abi.name}</Code>
            <Code type="bracket">(</Code>
          </>
        }
        suffix={<Code type="bracket">)</Code>}
        empty={data.arguments.length === 0}
      >
        <NextBracketDepth>
          <AbiArguments data={data.arguments} />
        </NextBracketDepth>
      </Container>
    );
  }
);
