import path from "path";

export * from "./types";

import { DatabasesOptions } from "./databases";

import { FSDatabases } from "./fs";
import { MemoryDatabases } from "./memory";
import { SqliteDatabases } from "./sqlite";

import { Collections } from "@truffle/db/meta";
import { Workspace, Definitions } from "./types";

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

  return new constructor({ definitions, settings });
};

const concretize = <C extends Collections>(
  config: DatabasesConfig
): {
  constructor: new (options: DatabasesOptions<C>) => Workspace<C>;
  settings: any;
} => {
  const {
    workingDirectory,
    adapter: { name, settings } = { name: "fs" }
  } = config;

  switch (name) {
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

const getDefaultFSAdapterSettings = workingDirectory => ({
  directory: path.join(workingDirectory, ".db", "json")
});

const getDefaultSqliteAdapterSettings = workingDirectory => ({
  directory: path.join(workingDirectory, ".db", "sqlite")
});
