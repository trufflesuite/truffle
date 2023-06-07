import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Result } from "./format.values.result";
import { NextBracketDepth } from "../providers/next-bracket-depth";
import { InjectedNode } from "../providers/injected-node";
import { useInjectedNode } from "../../contexts/injected-node";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { ArrayValue } = createCodecComponent(
  "ArrayValue",
  ({ value }: Format.Values.ArrayValue) => {
    const { prefix, suffix } = useInjectedNode();
    return (
      <Container
        prefix={
          <>
            {prefix?.prefix}
            <Code type="bracket">[</Code>
          </>
        }
        suffix={
          <>
            <Code type="bracket">]</Code>
            {suffix?.suffix}
          </>
        }
        empty={value.length === 0}
      >
        <NextBracketDepth>
          {value.map((result, index) => (
            <InjectedNode
              reset={index === value.length - 1}
              value={{
                content: { suffix: <Code type="comma">,&nbsp;</Code> },
                suffix: { suffix: <Code type="comma">,&nbsp;</Code> }
              }}
              key={index}
            >
              <Result data={result} />
            </InjectedNode>
          ))}
        </NextBracketDepth>
      </Container>
    );
  }
);
