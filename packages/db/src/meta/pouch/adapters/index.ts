import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch:adapters");

import type { Collections } from "@truffle/db/meta/collections";
import type { Generic } from "./types";
export { Generic };

import * as Base from "./base";
export { Base };

import * as Couch from "./couch";
export { Couch };

import * as Memory from "./memory";
export { Memory };

import * as IndexedDb from "./indexeddb";
export { IndexedDb };

export type Adapters = {
  couch: {
    databases: typeof Couch.Databases;
    settings: Couch.DatabasesSettings;
  };
  memory: {
    databases: typeof Memory.Databases;
    settings: Memory.DatabasesSettings;
  };
  indexeddb: {
    databases: typeof IndexedDb.Databases;
    settings: IndexedDb.DatabasesSettings;
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

export type AttachOptions<N extends AdapterName = AdapterName> =
  Generic.AttachOptions<Adapters, N>;

export type ConcretizeResult<
  C extends Collections,
  N extends AdapterName
> = Generic.ConcretizeResult<C, Adapters, N>;

export const concretize = <C extends Collections, N extends AdapterName>(
  options: AttachOptions<N> = {}
): ConcretizeResult<C, N> => {
  const { adapter: { name, settings } = { name: "indexeddb" } } = options;

  debug("Selecting %s adapter", name);
  switch (name) {
    case "couch": {
      return {
        constructor: Couch.Databases,
        settings: settings || Couch.getDefaultSettings()
      };
    }
    case "sqlite":
      const sqliteWarning =
        "Deprecated sqlite pouchdb adapter in truffle-config";
      debug(sqliteWarning);
      console.warn(sqliteWarning);
    // fall through and handle as indexeddb
    case "indexeddb": {
      return {
        constructor: IndexedDb.Databases,
        settings: settings || IndexedDb.getDefaultSettings()
      };
    }
    case "memory": {
      return {
        constructor: Memory.Databases,
        settings: settings || Memory.getDefaultSettings()
      };
    }
    default: {
      throw new Error(`Unknown Truffle DB adapter: ${name}`);
    }
  }
};
