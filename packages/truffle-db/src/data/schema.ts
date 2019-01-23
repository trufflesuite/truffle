import { scopeSchemas } from "./utils";

import { schema as artifactsSchema } from "truffle-db/artifacts";
import { schema as workspaceSchema } from "truffle-db/pouch";

export const schema = scopeSchemas({
  artifacts: artifactsSchema,
  workspace: workspaceSchema
});
