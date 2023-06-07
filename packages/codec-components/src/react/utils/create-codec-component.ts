import React from "react";
import type {
  CustomComponentsContextValue,
  CustomCodecComponent
} from "../contexts/custom-components";
import { useCustomComponents } from "../contexts/custom-components";

export interface PolymorphicComponentPropsBase<D> {
  data: D;
}
export interface PolymorphicComponentPropsWithComponent<D, C>
  extends PolymorphicComponentPropsBase<D> {
  component: C;
}
export interface PolymorphicComponentPropsWithoutComponent<D>
  extends PolymorphicComponentPropsBase<D> {
  component?: never;
}
export type PolymorphicComponentProps<D, C> = C extends React.ElementType
  ? PolymorphicComponentPropsWithComponent<D, C> &
      Omit<
        React.ComponentProps<C>,
        keyof PolymorphicComponentPropsWithComponent<D, C>
      >
  : PolymorphicComponentPropsWithoutComponent<D>;

export function createCodecComponent<
  N extends keyof NonNullable<CustomComponentsContextValue["codec"]>,
  D
>(name: N, createDefaultElement: (data: D) => JSX.Element) {
  function PolymorphicComponent<C>({
    data,
    component,
    ...props
  }: PolymorphicComponentProps<D, C>): JSX.Element {
    const customComponents = useCustomComponents();
    const customComponent = customComponents.codec?.[name] as
      | CustomCodecComponent<D>
      | undefined;

    return component
      ? React.createElement(component, { ...props, data })
      : customComponent
      ? React.createElement(customComponent, { data })
      : createDefaultElement(data);
  }

  return {
    [name]: PolymorphicComponent
  } as {
    [name in N]: typeof PolymorphicComponent;
  };
}
