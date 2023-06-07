import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Result } from "./format.values.result";
import { InjectedNode } from "../providers/injected-node";
import { Code } from "../common/code";

export const { StateVariable } = createCodecComponent(
  "StateVariable",
  (data: Codec.StateVariable) => (
    <InjectedNode
      value={{
        prefix: {
          prefix: (
            <>
              <Code type="contract">{data.class.typeName}</Code>
              <Code type="period">.</Code>
              <Code type="name">{data.name}</Code>
              <Code type="colon">:&nbsp;</Code>
            </>
          )
        }
      }}
    >
      <Result data={data.value} />
    </InjectedNode>
  )
);
