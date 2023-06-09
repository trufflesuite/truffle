import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { EnumValue } from "./format.values.enum-value";
import { InjectedNode } from "../providers/injected-node";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { TypeValueEnum } = createCodecComponent(
  "TypeValueEnum",
  ({ type, value }: Format.Values.TypeValueEnum) => (
    <Container
      prefix={
        <Code type="contract" title="type: contract type (debugger-only)">
          {type.type.typeName} type
        </Code>
      }
      empty={value.length === 0}
    >
      {value.map((enumValue, index) => (
        <InjectedNode
          reset={index === value.length - 1}
          value={{
            content: { suffix: <Code type="comma">,&nbsp;</Code> },
            suffix: { suffix: <Code type="comma">,&nbsp;</Code> }
          }}
          key={index}
        >
          <EnumValue data={enumValue} />
        </InjectedNode>
      ))}
    </Container>
  )
);
