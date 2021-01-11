import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:nameRecords");

import { DataModel, IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateNameRecordsLoad = Batch.generate<{
  assignment: {
    name: string;
    type: string;
    current: DataModel.NameRecord | undefined;
  };
  properties: {
    nameRecord: IdObject<DataModel.NameRecord>;
  };
  entry: DataModel.NameRecordInput;
  result: IdObject<DataModel.NameRecord>;
}>({
  extract<_I>({
    input: {
      resource: { id },
      type,
      current
    }
  }) {
    if (!current) {
      debug("no previous");
      return { resource: { id, type } };
    }

    if (current.resource.id === id) {
      debug("re-assigning same resource");
      return { resource: { id, type }, previous: current.previous };
    }

    debug("including previous");
    debug("previous id %o", current.resource.id);
    debug("id %o", id);

    return { resource: { id, type }, previous: { id: current.id } };
  },

  *process({ entries }) {
    return yield* resources.load("nameRecords", entries);
  },

  convert<_I, _O>({ result, input }) {
    debug("converting %o", result);
    return {
      ...input,
      nameRecord: result
    };
  }
});
