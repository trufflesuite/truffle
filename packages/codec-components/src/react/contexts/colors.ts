import { createContext, useContext } from "react";
import type { CodeProps } from "../components/common/code";

export type ColorsContextValue = Partial<
  Record<Exclude<NonNullable<CodeProps["type"]>, "bracket">, string> & {
    bracket: string[];
  }
>;
export const ColorsContext = createContext<ColorsContextValue>({});
export const useColors = () => useContext(ColorsContext);
