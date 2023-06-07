import React from "react";
import {
  ContainerDepthContext,
  useContainerDepth
} from "../../contexts/container-depth";

export interface NextContainerDepthProps {
  children: React.ReactNode;
}
export function NextContainerDepth({
  children
}: NextContainerDepthProps): JSX.Element {
  const value = useContainerDepth();
  value.current += 1;
  return (
    <ContainerDepthContext.Provider value={value}>
      {children}
    </ContainerDepthContext.Provider>
  );
}
