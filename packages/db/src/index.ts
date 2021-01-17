/**
 * API documentation
 *
 * @packageDocumentation
 */ /** */

import debugModule from "debug";
const debug = debugModule("db");

require("source-map-support/register");

import * as Meta from "./meta";
export { Meta };

export { Project } from "./project";

export { DataModel, Db } from "./resources";
import * as Resources from "./resources";
export { Resources };

import * as System from "./system";

export const connect = System.connect;
export const serve = System.serve;

export namespace GraphQl {
  export const schema = System.schema;
}

import * as Process from "./process";
export { Process };

import * as Batch from "./batch";
export { Batch };
