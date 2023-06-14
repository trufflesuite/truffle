import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { AccessListForAddress } from "./access-list-for-address";
import { InjectedNode } from "../providers/injected-node";
import { useInjectedNode } from "../../contexts/injected-node";
import { Container } from "../common/container";
import { Code } from "../common/code";

export const { AccessList } = createCodecComponent(
  "AccessList",
  (data: Codec.AccessList) => {
    const { prefix, suffix } = useInjectedNode();
    return (
      <Container
        prefix={<Code type="bracket">{prefix?.prefix}[</Code>}
        suffix={<Code type="bracket">]{suffix?.suffix}</Code>}
        empty={data.length === 0}
      >
        {data.map((accessListForAccess, index) => (
          <InjectedNode
            reset={index === data.length - 1}
            value={{ content: { suffix: <Code type="comma">,&nbsp;</Code> } }}
            key={index}
          >
            <AccessListForAddress data={accessListForAccess} />
          </InjectedNode>
        ))}
      </Container>
    );
  }
);
