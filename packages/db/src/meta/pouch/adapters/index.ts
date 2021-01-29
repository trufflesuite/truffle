import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters");

import { Collections } from "@truffle/db/meta/collections";
import { Generic } from "./types";

export { Generic };

import * as Base from "./base";
export { Base };

import * as Couch from "./couch";
export { Couch };

import * as Fs from "./fs";
export { Fs };

import * as Memory from "./memory";
export { Memory };

import * as Sqlite from "./sqlite";
export { Sqlite };

export type Adapters = {
  couch: {
    databases: typeof Couch.Databases;
    settings: Couch.DatabasesSettings;
  };
  fs: {
    databases: typeof Fs.Databases;
    settings: Fs.DatabasesSettings;
  };
  memory: {
    databases: typeof Memory.Databases;
    settings: Memory.DatabasesSettings;
  };
  sqlite: {
    databases: typeof Sqlite.Databases;
    settings: Sqlite.DatabasesSettings;
  };
};

export type AdapterName = Generic.AdapterName<Adapters>;

export type AdapterSettings<N extends AdapterName> = Generic.AdapterSettings<
  Adapters,
  N
>;

export type AdapterConstructorOptions<
  C extends Collections,
  N extends AdapterName
> = Generic.AdapterConstructorOptions<C, Adapters, N>;

export type AdapterConstructor<
  C extends Collections,
  N extends AdapterName
> = Generic.AdapterConstructor<C, Adapters, N>;

export type AdapterOptions = Generic.AdapterOptions<Adapters>;

export type AttachOptions<
  N extends AdapterName = AdapterName
> = Generic.AttachOptions<Adapters, N>;

export type ConcretizeResult<
  C extends Collections,
  N extends AdapterName
> = Generic.ConcretizeResult<C, Adapters, N>;

export const concretize = <C extends Collections, N extends AdapterName>(
  options: AttachOptions<N>
): ConcretizeResult<C, N> => {
  const { adapter: { name, settings } = { name: "sqlite" } } = options;

  debug("Selecting %s adapter", name);
  switch (name) {
    case "couch": {
      return {
        constructor: Couch.Databases,
        settings: settings || Couch.getDefaultSettings(options)
      };
    }
    case "fs": {
      return {
        constructor: Fs.Databases,
        settings: settings || Fs.getDefaultSettings(options)
      };
    }
    case "sqlite": {
      return {
        constructor: Sqlite.Databases,
        settings: settings || Sqlite.getDefaultSettings(options)
      };
    }
    case "memory": {
      return {
        constructor: Memory.Databases,
        settings: settings || Memory.getDefaultSettings(options)
      };
    }
    default: {
      throw new Error(`Unknown Truffle DB adapter: ${name}`);
    }
  }
};
