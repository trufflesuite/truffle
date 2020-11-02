import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:nameRecords");

import gql from "graphql-tag";
import camelCase from "camel-case";
import { IdObject, toIdObject } from "@truffle/db/meta";

import { Load } from "@truffle/db/loaders/types";
import { generate } from "@truffle/db/loaders/generate";

export { AddNameRecords } from "./add.graphql";
import { forType } from "./get.graphql";

type ResolveFunc = (
  name: string,
  type: string
) => Load<DataModel.NameRecord | null>;

function* getResourceName(
  { id }: IdObject,
  type: string
): Load<{ name: string }> {
  const GetResourceName = forType(type);

  const result = yield {
    type: "graphql",
    request: GetResourceName,
    variables: { id }
  };

  return result.data[camelCase(type)];
}

export function* generateNameRecordsLoad(
  resources: IdObject[],
  type: string,
  getCurrent: ResolveFunc
): Load<DataModel.NameRecord[]> {
  const inputs = [];
  for (const resource of resources) {
    const { name } = yield* getResourceName(resource, type);

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

  const nameRecords = yield* generate.load("nameRecords", inputs);
  const ids = nameRecords.map(({ id }) => id);

  return yield* generate.find(
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
}
