import { createContext, useContext } from "react";

export type BracketDepthContextValue = number;
export const BracketDepthContext = createContext<BracketDepthContextValue>(0);
export const useBracketDepth = () => useContext(BracketDepthContext);
