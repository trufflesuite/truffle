export type Modes = {
  [modeName: string]: (
    | {
        producesEffect: true;
        props: {};
      }
    | {
        producesEffect: false;
      }
  ) &
    (
      | {
          rendersComponent: true;
          props: {};
          inputPropName: string;
        }
      | {
          rendersComponent: false;
        }
    );
};

export type ModeName<M extends Modes> = string & keyof M;
export type Mode<M extends Modes, N extends ModeName<M> = ModeName<M>> = M[N];
export type ModeProps<
  M extends Modes,
  N extends ModeName<M>
> = "props" extends keyof Mode<M, N> ? Mode<M, N>["props"] : never;
export type ModeInputPropName<
  M extends Modes,
  N extends ModeName<M>
> = "inputPropName" extends keyof Mode<M, N>
  ? keyof ModeProps<M, N> & Mode<M, N>["inputPropName"]
  : never;
export type ModeInputProps<
  M extends Modes,
  N extends ModeName<M>
> = "inputPropName" extends keyof Mode<M, N>
  ? Pick<ModeProps<M, N>, ModeInputPropName<M, N>>
  : {};
export type ModeInputComponentProps<
  M extends Modes,
  N extends ModeName<M>
> = ModeProps<M, N> & {
  onSubmit: (inputProps: ModeInputProps<M, N>) => void;
} & {
    [P in keyof ModeInputProps<M, N>]: ModeInputProps<M, N>[P] | undefined;
  };

export type Definition<M extends Modes, N extends ModeName<M>> = {
  label: string;
} & (Mode<M, N>["producesEffect"] extends true
  ? { effect: (props: ModeProps<M, N>) => void }
  : {}) &
  (Mode<M, N>["rendersComponent"] extends true
    ? {
        propsInputComponent: (
          props: ModeInputComponentProps<M, N>
        ) => React.ReactNode;
        screenComponent: (props: ModeProps<M, N>) => React.ReactNode;
      }
    : {});

export type Definitions<M extends Modes> = {
  [N in ModeName<M>]: Definition<M, N>;
};
