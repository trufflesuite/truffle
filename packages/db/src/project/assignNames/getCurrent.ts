/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:assignNames:getCurrent");

import gql from "graphql-tag";
import { resources } from "@truffle/db/process";
import type { Resource } from "@truffle/db/resources";
import * as Batch from "./batch";

export const process = Batch.configure<{
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

  *process({
    entries,
    inputs: {
      project: { id }
    }
  }) {
    const nameRecords: (Resource<"nameRecords"> | undefined)[] = [];
    for (const { name, type } of entries) {
      const project = yield* resources.get(
        "projects",
        id,
        gql`
        fragment Resolve_${type}_${name.replace(/[^0-9a-zA-Z_]/, "")} on Project {
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

      if (!project || !project.resolve) {
        continue;
      }

      const {
        resolve: [nameRecord]
      } = project;

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
