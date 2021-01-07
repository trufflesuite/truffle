import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:resources");

import gql from "graphql-tag";
import pascalCase from "pascal-case";
import { singular } from "pluralize";
import { resources } from "@truffle/db/process";
import { IdObject, NamedCollectionName } from "@truffle/db/resources";
import * as Batch from "./batch";

export const generateResourceNames = Batch.generate<{
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

    return results.map(({ name }) => ({ name, type }));
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      ...result
    };
  }
});
