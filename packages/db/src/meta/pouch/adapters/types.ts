import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters:types");

import { Collections } from "@truffle/db/meta/collections";
import { Definitions } from "@truffle/db/meta/pouch/types";
import { Databases } from "./base";

export namespace Generic {
  export type Adapters = {
    [adapterName: string]: {
      databases: typeof Databases;
      settings: any;
    };
  };

  export type AdapterName<A extends Adapters> = string & keyof A;

  export type Adapter<A extends Adapters, N extends AdapterName<A>> = A[N];

  export type AdapterDatabases<
    A extends Adapters = Adapters,
    N extends AdapterName<A> = AdapterName<A>
  > = Adapter<A, N>["databases"];

  export type AdapterSettings<
    A extends Adapters = Adapters,
    N extends AdapterName<A> = AdapterName<A>
  > = Adapter<A, N>["settings"];

  export type AdapterConstructorOptions<
    C extends Collections,
    A extends Adapters = Adapters,
    N extends AdapterName<A> = AdapterName<A>
  > = {
    definitions: Definitions<C>;
    settings: AdapterSettings<A, N>;
  };

  export type AdapterConstructor<
    _C extends Collections,
    A extends Adapters = Adapters,
    N extends AdapterName<A> = AdapterName<A>
    // > = new (options: AdapterConstructorOptions<C, A, N>) => AdapterDatabases<A, N>;
  > = AdapterDatabases<A, N>;

  export type AdapterOptions<
    A extends Adapters,
    N extends AdapterName<A> = AdapterName<A>
  > = {
    [K in N]: {
      name: K;
      settings?: AdapterSettings<A, K>;
    };
  }[N];

  export interface AttachOptions<
    A extends Adapters,
    N extends AdapterName<A> = AdapterName<A>
  > {
    workingDirectory?: string;
    adapter?: AdapterOptions<A, N>;
  }

  export interface ConcretizeResult<
    C extends Collections,
    A extends Adapters,
    N extends AdapterName<A> = AdapterName<A>
  > {
    constructor: AdapterConstructor<C, A, N>;
    settings: AdapterSettings<A, N>;
  }
}

export type GetDefaultSettings = <
  A extends Generic.Adapters,
  N extends Generic.AdapterName<A>
>(
  options: Omit<Generic.AttachOptions<A, N>, "adapter">
) => Generic.AdapterSettings<A, N>;
