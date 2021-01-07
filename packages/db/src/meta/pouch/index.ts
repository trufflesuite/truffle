import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:pouch");

import path from "path";

export * from "./types";

import { DatabasesOptions } from "./databases";

import { CouchDatabases } from "./couch";
import { FSDatabases } from "./fs";
import { MemoryDatabases } from "./memory";
import { SqliteDatabases } from "./sqlite";

import { Collections } from "@truffle/db/meta/collections";
import { Workspace } from "@truffle/db/meta/data";
import { Definitions } from "./types";

export interface DatabasesConfig {
  workingDirectory?: string;
  adapter?: {
    name: string;
    settings?: any; // to allow adapters to define any options type
  };
}

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => (config: DatabasesConfig): Workspace<C> => {
  const { constructor, settings } = concretize<C>(config);

  debug("Initializing workspace...");
  const workspace = new constructor({ definitions, settings });

  return workspace;
};

const concretize = <C extends Collections>(
  config: DatabasesConfig
): {
  constructor: new (options: DatabasesOptions<C>) => Workspace<C>;
  settings: any;
} => {
  const {
    workingDirectory,
    adapter: { name, settings } = { name: "sqlite" }
  } = config;

  debug("Selecting %s adapter", name);
  switch (name) {
    case "couch": {
      return {
        constructor: CouchDatabases,
        settings: settings || getDefaultCouchAdapterSettings()
      };
    }
    case "fs": {
      return {
        constructor: FSDatabases,
        settings: settings || getDefaultFSAdapterSettings(workingDirectory)
      };
    }
    case "sqlite": {
      return {
        constructor: SqliteDatabases,
        settings: settings || getDefaultSqliteAdapterSettings(workingDirectory)
      };
    }
    case "memory": {
      return {
        constructor: MemoryDatabases,
        settings: settings
      };
    }
    default: {
      throw new Error(`Unknown Truffle DB adapter: ${name}`);
    }
  }
};

const getDefaultCouchAdapterSettings = () => ({
  url: "http://localhost:5984"
});

const getDefaultFSAdapterSettings = workingDirectory => ({
  directory: path.join(workingDirectory, ".db", "json")
});

const getDefaultSqliteAdapterSettings = workingDirectory => ({
  directory: path.join(workingDirectory, ".db", "sqlite")
});
