import { WorkspaceRequest, WorkspaceResponse } from "@truffle/db/loaders/types";
import { AddNameRecords } from "./add.graphql";
export { AddNameRecords };
interface Resource {
  id: string;
  name: string;
}
declare type ResolveFunc = (
  name: string,
  type: string
) => Generator<
  WorkspaceRequest,
  DataModel.INameRecord | null,
  WorkspaceResponse
>;
export declare function generateNameRecordsLoad(
  resources: Resource[],
  type: string,
  getCurrent: ResolveFunc
): Generator<
  WorkspaceRequest,
  DataModel.INameRecord[],
  WorkspaceResponse<"nameRecordsAdd", DataModel.INameRecordsAddPayload>
>;
