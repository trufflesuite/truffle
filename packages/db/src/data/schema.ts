import { scopeSchemas } from "./utils";

import { schema as workspaceSchema } from "@truffle/db/workspace";

// current subschemas come from workspace and loaders; eventually there will be one root schema
// which will be the schema found in workspace
export const schema = scopeSchemas({
  subschemas: {
    workspace: workspaceSchema
  }
});
