import { logger } from "@truffle/db/logger";
const debug = logger("db:project:names:nameRecords");

import { resources } from "@truffle/db/process";
import { Resource, Input, IdObject } from "@truffle/db/resources";
import * as Batch from "./batch";

export const generateNameRecordsLoad = Batch.generate<{
  assignment: {
    name: string;
    type: string;
    current: Resource<"nameRecords"> | undefined;
  };
  properties: {
    nameRecord: IdObject<"nameRecords">;
  };
  entry: Input<"nameRecords">;
  result: IdObject<"nameRecords">;
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
