import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { NextBracketDepth } from "../providers/next-bracket-depth";
import { Container } from "../common/container";
import { Code } from "../common/code";
import { AbiArguments } from "../common/abi-arguments";

export const { FunctionDecoding } = createCodecComponent(
  "FunctionDecoding",
  (data: Codec.FunctionDecoding) => {
    return (
      <Container
        prefix={
          <>
            <Code type="contract">{data.class.typeName}</Code>
            <Code type="period">.</Code>
            <Code type="function">{data.abi.name}</Code>
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
