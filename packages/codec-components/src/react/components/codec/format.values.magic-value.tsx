import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Result } from "./format.values.result";
import { NextBracketDepth } from "../providers/next-bracket-depth";
import { InjectedNode } from "../providers/injected-node";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { MagicValue } = createCodecComponent(
  "MagicValue",
  ({ type, value }: Format.Values.MagicValue) => {
    const valueLength = Object.keys(value).length;
    return (
      <Container
        prefix={
          <>
            <Code title="type: magic (debugger-only)">{type.variable}</Code>
            <Code type="colon">:</Code>
            <Code type="bracket">{"{"}</Code>
          </>
        }
        suffix={<Code type="bracket">{"}"}</Code>}
        empty={valueLength === 0}
      >
        <NextBracketDepth>
          {Object.entries(value).map(([name, result], index) => {
            const comma =
              index === valueLength - 1 ? (
                <Code type="comma">,&nbsp;</Code>
              ) : undefined;
            return (
              <InjectedNode
                value={{
                  prefix: {
                    prefix: (
                      <>
                        <Code type="name">{name}</Code>
                        <Code type="colon">:&nbsp;</Code>
                      </>
                    )
                  },
                  content: { suffix: comma },
                  suffix: { suffix: comma }
                }}
                key={index}
              >
                <Result data={result} />
              </InjectedNode>
            );
          })}
        </NextBracketDepth>
      </Container>
    );
  }
);
