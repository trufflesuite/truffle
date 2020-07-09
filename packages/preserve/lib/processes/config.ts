import { RequiredKeys } from "typelevel-ts";
// (yes, welcome! this is one of _those_ kinds of modules)

import * as Base from "./base";

export type MethodName<C extends Base.Config> = string & keyof C["methods"];

export type MethodConfig<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = C["methods"][N];

export type Options<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = MethodConfig<C, N>["options"];

export type Event<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = MethodConfig<C, N>["event"];

export type HasReturn<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = "return" extends keyof MethodConfig<C, N> ? true : false;

export type Return<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = true extends HasReturn<C, N> ? MethodConfig<C, N>["return"] : void;

export type RequiresAnything<T> = never extends RequiredKeys<T> ? false : true;

export type MethodProcess<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = true extends HasReturn<C, N>
  ? Process<Return<C, N>, Event<C, N>>
  : Process<void, Event<C, N>>;

export type Method<
  C extends Base.Config,
  N extends MethodName<C> = MethodName<C>
> = true extends RequiresAnything<Options<C, N>>
  ? (options: Options<C, N>) => MethodProcess<C, N>
  : (options?: Options<C, N>) => MethodProcess<C, N>;

export type Task<C extends Base.Config = Base.Config> = {
  [N in MethodName<C>]: Method<C, N>;
};

export type Process<
  R extends Base.Return = void,
  E extends Base.Event = Base.Event
> = AsyncGenerator<E, R, void>;
