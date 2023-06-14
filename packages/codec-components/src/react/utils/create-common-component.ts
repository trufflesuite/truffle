import React from "react";
import type {
  CustomComponent,
  CustomComponentsContextValue
} from "../contexts/custom-components";
import { useCustomComponents } from "../contexts/custom-components";

type CustomComponentProps<C> = C extends CustomComponent<infer P> ? P : never;

export function createCommonComponent<
  N extends keyof NonNullable<CustomComponentsContextValue["common"]>,
  P extends CustomComponentProps<
    NonNullable<CustomComponentsContextValue["common"]>[N]
  >
>(name: N, createDefaultElement: (props: P) => JSX.Element) {
  function CommonComponent(props: P): JSX.Element {
    const customComponents = useCustomComponents();
    const customComponent = customComponents.common?.[name];

    return customComponent
      ? React.createElement(customComponent, props as NonNullable<typeof props>)
      : createDefaultElement(props);
  }

  CommonComponent.displayName = name;

  return {
    [name]: CommonComponent
  } as {
    [name in N]: typeof CommonComponent;
  };
}
