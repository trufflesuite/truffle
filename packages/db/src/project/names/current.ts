import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import gql from "graphql-tag";
import { toIdObject, IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateCurrentNameRecords = Batch.generate<{
  assignment: {
    name: string;
    type: string;
  };
  properties: {
    current: IdObject<DataModel.NameRecord> | undefined;
  };
  entry: {
    name: string;
    type: string;
  };
  result: IdObject<DataModel.NameRecord> | undefined;
}>({
  extract<_I>({ input: { name, type } }) {
    return { name, type };
  },

  *process({ batch, inputs: { project } }) {
    const nameRecords: (IdObject<DataModel.NameRecord> | undefined)[] = [];
    for (const { name, type } of batch) {
      const {
        resolve: [nameRecord]
      } = yield* resources.get(
        "projects",
        project.id,
        gql`
        fragment Resolve_${type}_${name} on Project {
          resolve(type: "${type}", name: "${name}") {
            id
          }
        }
      `
      );

      nameRecords.push(nameRecord ? toIdObject(nameRecord) : undefined);
    }

    return nameRecords;
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
