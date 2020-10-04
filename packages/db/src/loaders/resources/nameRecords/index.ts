import {
  WorkspaceRequest,
  toIdObject,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { AddNameRecords } from "./add.graphql";
export { AddNameRecords };

interface Resource {
  id: string;
  name: string;
}

type ResolveFunc = (
  name: string,
  type: string
) => Generator<
  WorkspaceRequest,
  DataModel.INameRecord | null,
  WorkspaceResponse
>;

export function* generateNameRecordsLoad(
  resources: Resource[],
  type: string,
  getCurrent: ResolveFunc
): Generator<
  WorkspaceRequest,
  DataModel.INameRecord[],
  WorkspaceResponse<"nameRecordsAdd", DataModel.INameRecordsAddPayload>
> {
  const nameRecords = [];
  for (const resource of resources) {
    const { name } = resource;

    const current: DataModel.INameRecord = yield* getCurrent(name, type);

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
    request: AddNameRecords,
    variables: { nameRecords }
  };

  return result.data.workspace.nameRecordsAdd.nameRecords;
}
