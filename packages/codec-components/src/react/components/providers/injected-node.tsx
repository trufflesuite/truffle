import React from "react";
import {
  InjectedNodeContextValue,
  InjectedNodeContext
} from "../../contexts/injected-node";

export interface InjectedNodeBaseProps {
  children: React.ReactNode;
  value?: InjectedNodeContextValue;
  reset?: boolean;
}
export type InjectedNodeProps =
  | (InjectedNodeBaseProps & { value: InjectedNodeContextValue })
  | (InjectedNodeBaseProps & { reset: boolean });
export function InjectedNode({
  children,
  value,
  reset
}: InjectedNodeProps): JSX.Element {
  if (!value && !reset) return <>{children}</>;
  if (!value || reset) value = {};
  return (
    <InjectedNodeContext.Provider value={value}>
      {children}
    </InjectedNodeContext.Provider>
  );
}
