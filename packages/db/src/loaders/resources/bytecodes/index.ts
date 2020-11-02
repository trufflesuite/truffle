import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:bytecodes");

import { Load } from "@truffle/db/loaders/types";
import { IdObject, toIdObject } from "@truffle/db/meta";
import { AddBytecodes } from "./add.graphql";
export { AddBytecodes };

export function* generateBytecodesLoad(
  inputs: DataModel.BytecodeInput[]
): Load<IdObject<DataModel.Bytecode>[], { graphql: "bytecodesAdd" }> {
  const result = yield {
    type: "graphql",
    request: AddBytecodes,
    variables: { bytecodes: inputs }
  };

  const { bytecodes } = result.data.bytecodesAdd;

  return bytecodes.map(toIdObject);
}
