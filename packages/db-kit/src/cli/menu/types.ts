import type React from "react";

export type Config = {
  props: {};
  modes: {
    [modeName: string]: {
      selectable?: boolean;
    } & (
      | {
          effecting: true;
          effectProps?: {};
        }
      | {
          effecting?: false;
        }
    ) &
      (
        | {
            rendered: true;
            inputProps?: {};
            screenProps?: {};
          }
        | {
            rendered?: false;
          }
      );
  };
};

export type Modes<C extends Config> = C["modes"];
export type Props<C extends Config> = C["props"];

export namespace Mode {
  export type Name<C extends Config> = string & keyof Modes<C>;

  export type Mode<
    C extends Config,
    N extends Name<C> = Name<C>,
    F = undefined
  > = F extends ModeFilter
    ? Extract<Mode<C, N>, { [K in F["is"]]: true }> extends never
      ? never
      : Extract<Mode<C, N>, { [K in F["is"]]: true }>
    : Modes<C>[N];

  export type ModeFilter = {
    is: PropertyName<{ extends: boolean }>;
  };

  export type PropertyFilter = {
    extends: any;
  };

  export type PropertyName<F extends PropertyFilter = PropertyFilter> = {
    [P in string & keyof Mode<Config>]: F["extends"] extends Property<P, Config>
      ? P
      : never;
  }[string & keyof Mode<Config>];

  export type Property<
    P extends PropertyName,
    C extends Config = Config,
    N extends Name<C> = Name<C>
  > = Mode<C, N>[P];

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

  export type LabelDefinition<
    C extends Config,
    _N extends Name<C> | undefined = undefined
  > = {
    label: string;
  };

  export type EffectDefinition<
    C extends Config,
    _N extends Name<C> | undefined = undefined
  > = {
    effect: (props: Props<C>) => void;
  };

  export type FilteredName<C extends Config, F = undefined> = {
    [N in Name<C>]: Mode<C, N, F> extends never ? never : N;
  }[Name<C>];

  export type ComponentsDefinition<
    C extends Config,
    N extends Name<C> | undefined = undefined
  > = N extends Name<C>
    ? {
        components: {
          Inputs: Mode.Inputs.Component<C, N>;
          Container: Mode.Container.Component<C, N>;
          Screen: Mode.Screen.Component<C, N>;
        };
      }
    : {
        [N in Name<C>]: ComponentsDefinition<C, N>;
      }[FilteredName<C, { is: "rendered" }>];

  export type Definition<
    C extends Config,
    N extends Name<C> | undefined = undefined
  > = N extends Name<C>
    ? (Mode<C, N>["selectable"] extends true ? LabelDefinition<C, N> : {}) &
        (Mode<C, N>["effecting"] extends true ? EffectDefinition<C, N> : {}) &
        (Mode<C, N>["rendered"] extends true ? ComponentsDefinition<C, N> : {})
    : Definitions<C>[Mode.Name<C>];

  export type Definitions<C extends Config> = {
    [N in Mode.Name<C>]: Mode.Definition<C, N>;
  };

  export const selectable = <C extends Config>(
    definition: Definition<C>
  ): definition is Definition<C> & LabelDefinition<C> => "label" in definition;

  export const effecting = <C extends Config>(
    definition: Definition<C>
  ): definition is Definition<C> & EffectDefinition<C> =>
    "effect" in definition;

  export const rendered = <C extends Config>(
    definition: Definition<C>
  ): definition is Definition<C> & ComponentsDefinition<C> =>
    "components" in definition;
}
