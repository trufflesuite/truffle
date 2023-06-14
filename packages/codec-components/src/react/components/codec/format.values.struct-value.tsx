import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { NameValuePair } from "./format.values.name-value-pair";
import { NextBracketDepth } from "../providers/next-bracket-depth";
import { InjectedNode } from "../providers/injected-node";
import { useInjectedNode } from "../../contexts/injected-node";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { StructValue } = createCodecComponent(
  "StructValue",
  ({ value, type }: Format.Values.StructValue) => {
    const { prefix, suffix } = useInjectedNode();
    return (
      <Container
        prefix={
          <>
            {prefix?.prefix}
            {type.kind === "local" && (
              <>
                <Code type="contract">{type.definingContractName}</Code>
                <Code type="period">.</Code>
              </>
            )}
            <Code type="struct">{type.typeName}</Code>
            <Code type="bracket">(</Code>
            <NextBracketDepth>
              <Code type="bracket">{"{"}</Code>
            </NextBracketDepth>
          </>
        }
        suffix={
          <>
            <NextBracketDepth>
              <Code type="bracket">{"}"}</Code>
            </NextBracketDepth>
            <Code type="bracket">)</Code>
            {suffix?.suffix}
          </>
        }
        empty={value.length === 0}
      >
        <NextBracketDepth>
          {value.map((nameValuePair, index) => (
            <InjectedNode
              reset={index === value.length - 1}
              value={{
                content: { suffix: <Code type="comma">,&nbsp;</Code> },
                suffix: { suffix: <Code type="comma">,&nbsp;</Code> }
              }}
              key={index}
            >
              <NameValuePair data={nameValuePair} />
            </InjectedNode>
          ))}
        </NextBracketDepth>
      </Container>
    );
  }
);
