/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadMigrate:contracts");

import gql from "graphql-tag";
import type { IdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

export const process = Batch.configure<{
  artifact: {
    db: {
      contract: IdObject<"contracts">;
      callBytecode: IdObject<"bytecodes">;
      createBytecode: IdObject<"bytecodes">;
    };
  };
  produces: {
    callBytecode?: {
      linkReferences: { name: string | null }[] | null;
    };
    createBytecode?: {
      linkReferences: { name: string | null }[] | null;
    };
  };
  entry: IdObject<"contracts">;
  result:
    | {
        callBytecode?: {
          linkReferences: { name: string | null }[] | null;
        };
        createBytecode?: {
          linkReferences: { name: string | null }[] | null;
        };
      }
    | undefined;
}>({
  extract({ inputs: { artifacts }, breadcrumb: { artifactIndex } }) {
    return artifacts[artifactIndex].db.contract;
  },

  // @ts-ignore to accommodate non-obvious mismatch
  *process({ entries }) {
    const contracts = yield* resources.find(
      "contracts",
      entries.map(({ id }) => id),
      gql`
        fragment Bytecode on Bytecode {
          linkReferences {
            name
          }
        }

        fragment ContractBytecodes on Contract {
          callBytecode {
            ...Bytecode
          }
          createBytecode {
            ...Bytecode
          }
        }
      `
    );

    return contracts;
  },

  convert({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
