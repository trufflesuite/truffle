import React from "react";
import type { Format } from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { ElementaryValue } from "./format.values.elementary-value";
import { Result } from "./format.values.result";
import { InjectedNode } from "../providers/injected-node";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { KeyValuePair } = createCodecComponent(
  "KeyValuePair",
  ({ key, value }: Format.Values.KeyValuePair) => (
    <InjectedNode
      value={{
        ...useInjectedNode(),
        prefix: {
          prefix: (
            <>
              <InjectedNode reset>
                <ElementaryValue data={key} />
              </InjectedNode>
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
