import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:nameRecords");

import { Load } from "@truffle/db/loaders/types";
import { toIdObject } from "@truffle/db/meta";

import { AddNameRecords } from "./add.graphql";
export { AddNameRecords };

interface Resource {
  id: string;
  name: string;
}

type ResolveFunc = (
  name: string,
  type: string
) => Load<DataModel.NameRecord | null>;

export function* generateNameRecordsLoad(
  resources: Resource[],
  type: string,
  getCurrent: ResolveFunc
): Load<DataModel.NameRecord[]> {
  const nameRecords = [];
  for (const resource of resources) {
    const { name } = resource;
    const current: DataModel.NameRecord = yield* getCurrent(name, type);

    if (current) {
      nameRecords.push({
        name,
        type,
        resource: toIdObject(resource),
        previous: toIdObject(current)
      });
    } else {
      nameRecords.push({
        name,
        type,
        resource: toIdObject(resource)
      });
    }
  }

  const result = yield {
    type: "graphql",
    request: AddNameRecords,
    variables: { nameRecords }
  };

  return result.data.nameRecordsAdd.nameRecords;
}
