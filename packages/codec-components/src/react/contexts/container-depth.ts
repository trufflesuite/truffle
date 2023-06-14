import { createContext, useContext } from "react";

export interface ContainerDepthContextValue {
  current: number;
  initialFoldDepth: number;
}
export const ContainerDepthContext = createContext<ContainerDepthContextValue>({
  current: 0,
  initialFoldDepth: 1
});
export const useContainerDepth = () => {
  const { current, initialFoldDepth } = useContext(ContainerDepthContext);
  return {
    current,
    initialFoldDepth,
    initialFold: initialFoldDepth > -1 && current >= initialFoldDepth,
    root: current === 0
  };
};
