import React from "react";
import { createCommonComponent } from "../../utils/create-common-component";
import { useInjectedNode } from "../../contexts/injected-node";
import { Code } from "./code";

export interface CodecErrorProps {
  children?: React.ReactNode;
  kind: string;
}

export const { CodecError } = createCommonComponent(
  "CodecError",
  ({ kind, children }) => {
    const { prefix, content } = useInjectedNode();
    return (
      <Code>
        {prefix?.prefix}
        {kind}
        {children && (
          <>
            <Code type="colon">:</Code> {children}
          </>
        )}
        {content?.suffix}
      </Code>
    );
  }
);
