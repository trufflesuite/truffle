/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:assignNames:lookupNames");

import gql from "graphql-tag";
import { pascalCase } from "change-case";
import { singular } from "pluralize";
import { resources } from "@truffle/db/process";
import type {
  Resource,
  IdObject,
  NamedCollectionName
} from "@truffle/db/resources";
import * as Batch from "./batch";

export const process = Batch.configure<{
  assignment: {};
  properties: {
    name: string;
    type: string;
  };
  entry: IdObject;
  result: {
    name: string;
    type: string;
  };
}>({
  extract<_I>({ input: { resource } }) {
    return resource;
  },

  *process({ entries, inputs: { collectionName } }) {
    const type = pascalCase(singular(collectionName));

    const results = yield* resources.find(
      collectionName as NamedCollectionName,
      entries.map(({ id }) => id),
      gql`
        fragment ${type}Name on ${type} {
          name
        }
      `
    );

    // catch unknown resources so we can abort
    const missing = results
      .map((resource, index) => !resource && entries[index].id)
      .filter((id): id is string => !!id);
    if (missing.length > 0) {
      throw new Error(`Unknown ${collectionName}: ${missing.join(", ")}`);
    }

    return results.map(({ name }: Resource<NamedCollectionName>) => ({
      name,
      type
    }));
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
