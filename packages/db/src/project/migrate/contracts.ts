import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import gql from "graphql-tag";
import { DataModel, IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateContracts = Batch.generate<{
  artifact: {
    db: {
      contract: IdObject<DataModel.Contract>;
      callBytecode: IdObject<DataModel.Bytecode>;
      createBytecode: IdObject<DataModel.Bytecode>;
    };
  };
  produces: {
    callBytecode?: {
      linkReferences: { name: string }[];
    };
    createBytecode?: {
      linkReferences: { name: string }[];
    };
  };
  entry: IdObject<DataModel.Contract>;
  result: {
    callBytecode?: {
      linkReferences: { name: string }[];
    };
    createBytecode?: {
      linkReferences: { name: string }[];
    };
  };
}>({
  extract({ inputs: { artifacts }, breadcrumb: { artifactIndex } }) {
    return artifacts[artifactIndex].db.contract;
  },

  *process({ entries }) {
    return yield* resources.find(
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
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
