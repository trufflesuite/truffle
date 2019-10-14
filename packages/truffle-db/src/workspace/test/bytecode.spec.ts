import { generateId, Migrations, WorkspaceClient } from './utils';
import { Query, Mutation } from './queries';

const { GetBytecode } = Query;
const { AddBytecode } = Mutation;

describe("Bytecode", () => {
  let wsClient;
  let expectedId;
  let variables, addBytecodeResult;

  beforeEach(async () => {
    wsClient = new WorkspaceClient();
    expectedId = generateId({ bytes: Migrations.bytecode });
    variables = { bytes: Migrations.bytecode };
    addBytecodeResult = await wsClient.execute(AddBytecode, { bytes: variables.bytes });
  });

  test ("can be added", async () => {
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

  test("can be queried", async() =>{
    const executionResult = await wsClient.execute(GetBytecode, { id: expectedId });
    expect(executionResult).toHaveProperty("bytecode");

    const { bytecode } = executionResult;
    expect(bytecode).toHaveProperty("id");
    expect(bytecode).toHaveProperty("bytes");

    const { id, bytes } = bytecode;
    expect(id).toEqual(expectedId);
    expect(bytes).toEqual(variables.bytes);
  });
});

