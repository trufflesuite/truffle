import React from "react";
import type { ClassNamePrefixContextValue } from "../../contexts/class-name-prefix";
import {
  ClassNamePrefixContext,
  useClassNamePrefix
} from "../../contexts/class-name-prefix";
import type { ColorsContextValue } from "../../contexts/colors";
import { ColorsContext, useColors } from "../../contexts/colors";
import type { ContainerDepthContextValue } from "../../contexts/container-depth";
import {
  ContainerDepthContext,
  useContainerDepth
} from "../../contexts/container-depth";
import type { CustomComponentsContextValue } from "../../contexts/custom-components";
import {
  CustomComponentsContext,
  useCustomComponents
} from "../../contexts/custom-components";

export type CodecComponentsProviderProps = {
  children?: React.ReactNode;
  classNamePrefix?: ClassNamePrefixContextValue;
  colors?: ColorsContextValue;
  initialFoldDepth?: ContainerDepthContextValue["initialFoldDepth"];
  components?: CustomComponentsContextValue;
};
export function CodecComponentsProvider(
  props: CodecComponentsProviderProps
): JSX.Element {
  const classNamePrefix = useClassNamePrefix();
  const containerDepth = useContainerDepth();
  const customComponents = useCustomComponents();
  return (
    <ClassNamePrefixContext.Provider
      value={props.classNamePrefix || classNamePrefix}
    >
      <ColorsContext.Provider value={{ ...useColors(), ...props.colors }}>
        <ContainerDepthContext.Provider
          value={{
            current: containerDepth.current,
            initialFoldDepth:
              props.initialFoldDepth ?? containerDepth.initialFoldDepth
          }}
        >
          <CustomComponentsContext.Provider
            value={{
              codec: {
                ...customComponents.codec,
                ...props.components?.codec
              },
              common: {
                ...customComponents.common,
                ...props.components?.common
              }
            }}
          >
            {props.children}
          </CustomComponentsContext.Provider>
        </ContainerDepthContext.Provider>
      </ColorsContext.Provider>
    </ClassNamePrefixContext.Provider>
  );
}
