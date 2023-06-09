import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { AccessList } from "./access-list";
import { NextBracketDepth } from "../providers/next-bracket-depth";
import { InjectedNode } from "../providers/injected-node";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { Options } = createCodecComponent(
  "Options",
  (optionsData: Codec.Options) => {
    const optionEntries = Object.entries(optionsData) as NonNullable<
      {
        [Name in keyof Codec.Options]: [Name, Codec.Options[Name]];
      }[keyof Codec.Options]
    >[];

    return (
      <Container
        prefix={<Code type="bracket">{"{"}</Code>}
        suffix={<Code type="bracket">{"}"}</Code>}
        empty={optionEntries.length === 0}
      >
        <NextBracketDepth>
          {optionEntries.map(([name, value], index) => {
            if (value === undefined) return;

            const nameWithColon = (
              <>
                <Code>{name}</Code>
                <Code type="colon">:&nbsp;</Code>
              </>
            );
            const comma =
              index !== optionEntries.length - 1 ? (
                <Code type="comma">,</Code>
              ) : undefined;

            switch (name) {
              case "accessList": {
                return (
                  <InjectedNode
                    value={{
                      prefix: { prefix: nameWithColon },
                      suffix: { suffix: comma }
                    }}
                  >
                    <AccessList data={value} />
                  </InjectedNode>
                );
              }
              case "privateFor": {
                return (
                  <Container
                    prefix={
                      <>
                        {nameWithColon}
                        <Code type="bracket">[</Code>
                      </>
                    }
                    suffix={<Code type="bracket">]{comma}</Code>}
                    empty={value.length === 0}
                  >
                    {value.map((string, index) => (
                      <Code type="string" key={index}>
                        {string}
                        {index !== value.length - 1 && (
                          <Code type="comma">,&nbsp;</Code>
                        )}
                      </Code>
                    ))}
                  </Container>
                );
              }
              default: {
                return (
                  <Code>
                    {nameWithColon}
                    <Code
                      type={
                        name === "overwrite"
                          ? "boolean"
                          : name === "from" || name === "to"
                          ? "address"
                          : name === "data" || name === "type"
                          ? "bytes"
                          : "number"
                      }
                    >
                      {value.toString()}
                    </Code>
                    {comma}
                  </Code>
                );
              }
            }
          })}
        </NextBracketDepth>
      </Container>
    );
  }
);
