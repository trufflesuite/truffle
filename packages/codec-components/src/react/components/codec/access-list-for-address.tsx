import React from "react";
import type * as Codec from "@truffle/codec";
import { createCodecComponent } from "../../utils/create-codec-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "../common/code";

export const { AccessListForAddress } = createCodecComponent(
  "AccessListForAddress",
  ({ address }: Codec.AccessListForAddress) => {
    return (
      <Code type="address" title="type: address (access list)">
        {address}
        {useInjectedNode().content?.suffix}
      </Code>
    );
  }
);
