import { logger } from "@truffle/db/logger";
const debug = logger("db:meta");

export * from "./ids";
export * from "./requests";
export * from "./collections";
export * from "./requests";
export * from "./interface";
export * from "./data";
export * from "./definitions";

import { Collections } from "./collections";
import { Definitions } from "./definitions";
import * as GraphQl from "./graphql";
export { GraphQl };
import * as Pouch from "./pouch";
export { Pouch };
import * as Interface from "./interface";
import * as Process from "./process";
export { Process };

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => {
  const attach = Pouch.forDefinitions(definitions);
  const schema = GraphQl.forDefinitions(definitions);

  const { connect, serve } = Interface.forAttachAndSchema({
    attach,
    schema
  });

  const { forDb, resources } = Process.forDefinitions(definitions);

  return {
    schema,
    attach,
    connect,
    serve,
    process: {
      forDb,
      resources
    }
  };
};
