import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { Result } from "./format.values.result";
import { InjectedNode } from "../providers/injected-node";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { AbiArgument } = createCodecComponent(
  "AbiArgument",
  ({ value, name }: Codec.AbiArgument) => (
    <InjectedNode
      value={{
        ...useInjectedNode(),
        prefix: {
          prefix: name ? (
            <>
              <Code type="name">{name}</Code>
              <Code type="colon">:&nbsp;</Code>
            </>
          ) : undefined
        }
      }}
    >
      <Result data={value} />
    </InjectedNode>
  )
);
