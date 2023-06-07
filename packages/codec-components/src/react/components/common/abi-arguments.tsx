import React from "react";
import type * as Codec from "@truffle/codec";
import { createCommonComponent } from "../../utils/create-common-component";
import { AbiArgument } from "../codec/abi-argument";
import { InjectedNode } from "../providers/injected-node";
import { Code } from "../common/code";

export interface AbiArgumentsProps {
  data: Codec.AbiArgument[];
}

export const { AbiArguments } = createCommonComponent(
  "AbiArguments",
  ({ data }) => (
    <>
      {data.map((abiArgumentData, index) => (
        <InjectedNode
          reset={index === data.length - 1}
          value={{
            content: { suffix: <Code type="comma">,&nbsp;</Code> },
            suffix: { suffix: <Code type="comma">,&nbsp;</Code> }
          }}
          key={index}
        >
          <AbiArgument data={abiArgumentData} />
        </InjectedNode>
      ))}
    </>
  )
);
