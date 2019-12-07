import { generateId, Migrations, WorkspaceClient } from "./utils";
import { AddBytecode, GetBytecode } from "./bytecode.graphql";

let expectedBytecodeId, wsClient;

beforeAll(async () => {
  expectedBytecodeId = generateId({ bytes: Migrations.bytecode });
  wsClient = new WorkspaceClient();
  await wsClient.execute(AddBytecode, { bytes: Migrations.bytecode });
});

describe("Persisted data", () => {
  test("Directories are saved for all resources", async () => {
    const destroy = await wsClient.destroy("bytecodes");

    const executionResult = await wsClient.execute(
      GetBytecode,
      { id: expectedBytecodeId },
      false
    );
    expect(executionResult.bytecode).toBe(null);

    const executionResultPersisted = await wsClient.execute(
      GetBytecode,
      { id: expectedBytecodeId },
      true
    );
    expect(executionResultPersisted.bytecode.bytes).toEqual(
      Migrations.bytecode
    );
  });
});
