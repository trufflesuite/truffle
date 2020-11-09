import debugModule from "debug";
const debug = debugModule("db");

require("source-map-support/register");

export { Collections, definitions } from "./resources";
export { schema } from "./schema";
export { Db } from "./meta";
export { TruffleDB } from "./db";
export { serve } from "./server";

export { Project } from "./loaders";
