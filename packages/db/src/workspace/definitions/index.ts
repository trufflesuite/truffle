import { Definitions } from "./types";
export * from "./types";

import { sources } from "./sources";
import { bytecodes } from "./bytecodes";

export const definitions: Definitions = {
  sources,
  bytecodes,
  contracts: {
    createIndexes: [
      {
        fields: ["compilation.id", "processedSource.index"]
      }
    ],
    idFields: ["name", "abi", "processedSource", "compilation"]
  },
  compilations: {
    createIndexes: [],
    idFields: ["compiler", "sources"]
  },
  networks: {
    createIndexes: [],
    idFields: ["networkId", "historicBlock"]
  },
  contractInstances: {
    createIndexes: [],
    idFields: ["address", "network"]
  },
  nameRecords: {
    createIndexes: [],
    idFields: ["name", "type", "resource", "previous"]
  },
  projects: {
    createIndexes: [],
    idFields: ["directory"]
  },
  projectNames: {
    createIndexes: [
      {
        fields: ["project.id"]
      },
      {
        fields: ["project.id", "type"]
      },
      {
        fields: ["project.id", "name", "type"]
      }
    ],
    idFields: ["project", "name", "type"]
  }
};
