import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:current");

import gql from "graphql-tag";
import { resources } from "@truffle/db/process";
import { Resource } from "@truffle/db/resources";
import * as Batch from "./batch";

export const generateCurrentNameRecords = Batch.generate<{
  assignment: {
    name: string;
    type: string;
  };
  properties: {
    current: Resource<"nameRecords"> | undefined;
  };
  entry: {
    name: string;
    type: string;
  };
  result: Resource<"nameRecords"> | undefined;
}>({
  extract<_I>({ input: { name, type } }) {
    return { name, type };
  },

  *process({ entries, inputs: { project } }) {
    const nameRecords: (Resource<"nameRecords"> | undefined)[] = [];
    for (const { name, type } of entries) {
      const {
        resolve: [nameRecord]
      } = yield* resources.get(
        "projects",
        project.id,
        gql`
        fragment Resolve_${type}_${name} on Project {
          resolve(type: "${type}", name: "${name}") {
            id
            resource {
              id
              type
            }
            previous {
              id
            }
          }
        }
      `
      );

      nameRecords.push(nameRecord);
    }

    return nameRecords;
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      current: result
    };
  }
});
