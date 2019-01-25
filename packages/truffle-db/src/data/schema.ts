import { scopeSchemas } from "./utils";

import { abiItem, schema as artifactsSchema } from "truffle-db/artifacts";
import { schema as workspaceSchema } from "truffle-db/workspace";

export const schema = scopeSchemas({
  subschemas: {
    artifacts: artifactsSchema,
    workspace: workspaceSchema,
  },
  typeDefs: [
    [abiItem],
    `extend type ABI {
      items: [AbiItem]!
    }`
  ]
});
