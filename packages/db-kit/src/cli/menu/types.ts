import type React from "react";

export type Config = {
  props: {};
  modes: {
    [modeName: string]: (
      | {
          producesEffect: true;
          effectProps?: {};
        }
      | {
          producesEffect: false;
        }
    ) &
      (
        | {
            rendersComponent: true;
            inputProps?: {};
            screenProps?: {};
          }
        | {
            rendersComponent: false;
          }
      );
  };
};

export type Modes<C extends Config> = C["modes"];
export type Props<C extends Config> = C["props"];

export namespace Mode {
  export type Name<C extends Config> = string & keyof Modes<C>;

  export type Mode<C extends Config, N extends Name<C> = Name<C>> = Modes<C>[N];

  export type InputProps<
    C extends Config,
    N extends Name<C>
  > = "inputProps" extends keyof Mode<C, N> ? Mode<C, N>["inputProps"] : {};

  export type ScreenProps<
    C extends Config,
    N extends Name<C>
  > = "screenProps" extends keyof Mode<C, N> ? Mode<C, N>["screenProps"] : {};

  export namespace Inputs {
    export type ComponentProps<
      C extends Config,
      N extends Name<C>
    > = InputProps<C, N> & {
      onSubmit: (inputProps: InputProps<C, N>) => void;
    } & Props<C> &
      {
        [P in keyof InputProps<C, N>]: InputProps<C, N>[P] | undefined;
      };

    export type Component<C extends Config, N extends Name<C>> = (
      props: ComponentProps<C, N>
    ) => React.ReactElement | null;
  }

  export namespace Container {
    export type ComponentProps<C extends Config, N extends Name<C>> = Props<C> &
      InputProps<C, N> & {
        Screen: Screen.Component<C, N>;
      };

    export type Component<C extends Config, N extends Name<C>> = (
      props: ComponentProps<C, N>
    ) => React.ReactElement | null;
  }

  export namespace Screen {
    export type ComponentProps<C extends Config, N extends Name<C>> = Props<C> &
      InputProps<C, N> &
      ScreenProps<C, N>;

    export type Component<C extends Config, N extends Name<C>> = (
      props: ComponentProps<C, N>
    ) => React.ReactElement | null;
  }

  export type EffectDefinition<C extends Config, _N extends Name<C>> = {
    effect: (props: Props<C>) => void;
  };

  export type ComponentsDefinition<C extends Config, N extends Name<C>> = {
    components: {
      Inputs: Mode.Inputs.Component<C, N>;
      Container: Mode.Container.Component<C, N>;
      Screen: Mode.Screen.Component<C, N>;
    };
  };

  export type Definition<C extends Config, N extends Name<C>> = {
    label: string;
  } & (Mode<C, N>["producesEffect"] extends true
    ? EffectDefinition<C, N>
    : {}) &
    (Mode<C, N>["rendersComponent"] extends true
      ? ComponentsDefinition<C, N>
      : {});

  export const producesEffect = <C extends Config, N extends Name<C>>(
    definition: Definition<C, N>
  ): definition is Definition<C, N> & EffectDefinition<C, N> =>
    "effect" in definition;

  export const rendersComponent = <C extends Config, N extends Name<C>>(
    definition: Definition<C, N>
  ): definition is Definition<C, N> & ComponentsDefinition<C, N> =>
    "components" in definition;
}

export type Definitions<C extends Config> = {
  [N in Mode.Name<C>]: Mode.Definition<C, N>;
};
