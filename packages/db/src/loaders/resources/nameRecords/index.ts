import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:nameRecords");

import gql from "graphql-tag";
import camelCase from "camel-case";
import { plural } from "pluralize";
import { IdObject, toIdObject } from "@truffle/db/meta";

import { Process, NamedCollectionName } from "@truffle/db/resources";
import { generate } from "@truffle/db/generate";

export { AddNameRecords } from "./add.graphql";

type ResolveFunc = (
  name: string,
  type: string
) => Process<DataModel.NameRecord | null>;

function* getResourceName({ id }: IdObject, type: string): Process<string> {
  const { name } = yield* generate.get(
    camelCase(plural(type)) as NamedCollectionName,
    id,
    gql`
    fragment Name on ${type} {
      name
    }
  `
  );

  return name;
}

export function* generateNameRecordsLoad(
  resources: IdObject[],
  type: string,
  getCurrent: ResolveFunc
): Process<DataModel.NameRecord[]> {
  const inputs = [];
  for (const resource of resources) {
    const name = yield* getResourceName(resource, type);

    const current: DataModel.NameRecord = yield* getCurrent(name, type);

    if (current) {
      inputs.push({
        name,
        type,
        resource,
        previous: toIdObject(current)
      });
    } else {
      inputs.push({
        name,
        type,
        resource
      });
    }
  }

  const ids = (yield* generate.load("nameRecords", inputs)).map(({ id }) => id);

  const nameRecords = yield* generate.find(
    "nameRecords",
    ids,
    gql`
      fragment NameRecord on NameRecord {
        id
        name
        type
        resource {
          name
        }
        previous {
          id
          name
        }
      }
    `
  );

  return nameRecords;
}
