import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Result } from "./format.values.result";
import { InjectedNode } from "../providers/injected-node";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { NameValuePair } = createCodecComponent(
  "NameValuePair",
  ({ name, value }: Format.Values.NameValuePair) => (
    <InjectedNode
      value={{
        ...useInjectedNode(),
        prefix: {
          prefix: (
            <>
              <Code type="name">{name}</Code>
              <Code type="colon">:&nbsp;</Code>
            </>
          )
        }
      }}
    >
      <Result data={value} />
    </InjectedNode>
  )
);
