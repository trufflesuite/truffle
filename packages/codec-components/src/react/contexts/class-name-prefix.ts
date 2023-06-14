import { createContext, useContext } from "react";

export type ClassNamePrefixContextValue = string;
export const ClassNamePrefixContext =
  createContext<ClassNamePrefixContextValue>("codec-components");
export const useClassNamePrefix = () => useContext(ClassNamePrefixContext);
