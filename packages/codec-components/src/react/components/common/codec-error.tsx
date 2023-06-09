import React from "react";
import { createCommonComponent } from "../../utils/create-common-component";
import { Code } from "./code";

export interface CodecErrorProps {
  children?: React.ReactNode;
  kind: string;
}

export const { CodecError } = createCommonComponent(
  "CodecError",
  ({ children, kind }) => (
    <Code>
      {kind}
      {children && (
        <>
          <Code type="colon">:</Code> {children}
        </>
      )}
    </Code>
  )
);
