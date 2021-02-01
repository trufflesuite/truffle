import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projects:resolveNameRecords");

import type {
  SavedInput,
  IdObject,
  Workspace
} from "@truffle/db/resources/types";

export async function resolveNameRecords(
  project: IdObject<"projects">,
  inputs: {
    name?: string;
    type?: string;
  },
  context: {
    workspace: Workspace;
  },
  _?
): Promise<SavedInput<"nameRecords">[]> {
  const { id } = project;
  const { name, type } = inputs;
  const { workspace } = context;

  const results = await workspace.find("projectNames", {
    selector: {
      "project.id": id,
      "key.name": name,
      "key.type": type
    }
  });
  const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
  const nameRecords = await workspace.find("nameRecords", {
    selector: {
      id: { $in: nameRecordIds }
    }
  });

  return nameRecords;
}
