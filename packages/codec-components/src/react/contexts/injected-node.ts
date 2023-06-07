import { createContext, useContext } from "react";

export interface InjectedNodeContextValue {
  prefix?: { prefix?: React.ReactNode };
  content?: { suffix?: React.ReactNode };
  suffix?: { suffix?: React.ReactNode };
}
export const InjectedNodeContext = createContext<InjectedNodeContextValue>({});
export const useInjectedNode = () => useContext(InjectedNodeContext);
