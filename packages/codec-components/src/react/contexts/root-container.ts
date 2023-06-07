import { createContext, useContext } from "react";

export type RootContainerContextValue = boolean;
export const RootContainerContext =
  createContext<RootContainerContextValue>(true);
export const useRootContainer = () => useContext(RootContainerContext);
