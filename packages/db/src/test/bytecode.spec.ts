import { generateId, Migrations, WorkspaceClient } from "./utils";
import { AddBytecode, GetAllBytecodes, GetBytecode } from "./bytecode.graphql";
import { Shims } from "@truffle/compile-common";

describe("Bytecode", () => {
  let wsClient;
  let expectedId;
  let addBytecodeResult, shimmedBytecode;

  beforeEach(async () => {
    wsClient = new WorkspaceClient();
    shimmedBytecode = Shims.LegacyToNew.forBytecode(Migrations.bytecode);
    expectedId = generateId(shimmedBytecode);
    addBytecodeResult = await wsClient.execute(AddBytecode, shimmedBytecode);
  });

  test("can be added", async () => {
    expect(addBytecodeResult).toHaveProperty("bytecodesAdd");
    const { bytecodesAdd } = addBytecodeResult;
    expect(bytecodesAdd).toHaveProperty("bytecodes");

    const { bytecodes } = bytecodesAdd;
    expect(bytecodes).toHaveLength(1);

    const bytecode = bytecodes[0];
    expect(bytecode).toHaveProperty("id");

    const { id } = bytecode;
    expect(id).toEqual(expectedId);
  });

  test("can be queried", async () => {
    const executionResult = await wsClient.execute(GetBytecode, {
      id: expectedId
    });

    expect(executionResult).toHaveProperty("bytecode");

    const { bytecode } = executionResult;
    expect(bytecode).toHaveProperty("id");
    expect(bytecode).toHaveProperty("bytes");

    const { id, bytes, linkReferences } = bytecode;
    expect(id).toEqual(expectedId);
    expect(bytes).toEqual(shimmedBytecode.bytes);
    expect(linkReferences).toEqual(shimmedBytecode.linkReferences);
  });

  test("can retrieve all bytecodes", async () => {
    const executionResult = await wsClient.execute(GetAllBytecodes, {});

    expect(executionResult).toHaveProperty("bytecodes");

    const { bytecodes } = executionResult;

    expect(bytecodes).toHaveProperty("length");

    bytecodes.forEach(bc => {
      expect(bc).toHaveProperty("id");
      expect(bc).toHaveProperty("bytes");
      expect(bc).toHaveProperty("linkReferences");
      expect(bc).toHaveProperty("instructions");
    });
  });
});
