import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:contracts");

import gql from "graphql-tag";
import { Process, resources } from "@truffle/db/project/process";
import { IdObject } from "@truffle/db/meta";

export { FindContracts } from "./find.graphql";
export { AddContracts } from "./add.graphql";

export function* generateContractGet({
  id
}: IdObject<DataModel.Contract>): Process<DataModel.Contract | undefined> {
  debug("Generating contract get...");

  const contract = yield* resources.get(
    "contracts",
    id,
    gql`
      fragment ContractBytecodes on Contract {
        id
        name
        createBytecode {
          id
          bytes
          linkReferences {
            name
          }
        }
        callBytecode {
          id
          bytes
          linkReferences {
            name
          }
        }
      }
    `
  );

  debug("Generated contract get.");
  return contract;
}
