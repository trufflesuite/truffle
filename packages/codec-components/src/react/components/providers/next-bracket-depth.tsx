import React from "react";
import {
  BracketDepthContext,
  useBracketDepth
} from "../../contexts/bracket-depth";

export interface NextBracketDepthProps {
  children: React.ReactNode;
}
export function NextBracketDepth({
  children
}: NextBracketDepthProps): JSX.Element {
  return (
    <BracketDepthContext.Provider value={useBracketDepth() + 1}>
      {children}
    </BracketDepthContext.Provider>
  );
}
