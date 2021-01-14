import {logger} from "@truffle/db/logger";
const debug = logger("db:resources");

import { forDefinitions } from "@truffle/db/meta";
import {Definitions} from "./types";
export * from "./types";

import {sources} from "./sources";
import {bytecodes} from "./bytecodes";
import {compilations} from "./compilations";
import {contracts} from "./contracts";
import {contractInstances} from "./contractInstances";
import {networks} from "./networks";
import {nameRecords} from "./nameRecords";
import {projects} from "./projects";
import {projectNames} from "./projectNames";
import {networkGenealogies} from "./networkGenealogies";

export const definitions: Definitions = {
  sources,
  bytecodes,
  compilations,
  contracts,
  contractInstances,
  networks,
  nameRecords,
  projects,
  projectNames,
  networkGenealogies
};

export const {
  schema,
  connect,
  serve,
  attach,
  Run,
  resources
} = forDefinitions(definitions);
