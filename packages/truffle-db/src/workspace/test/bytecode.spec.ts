import { generateId, Migrations, WorkspaceClient } from './utils';
import { Query, Mutation } from './queries';

const { GetBytecode } = Query;
const { AddBytecode } = Mutation;

describe("Bytecode", () => {
  it("adds bytecode", async () => {
    const client = new WorkspaceClient();

    const expectedId = generateId({ bytes: Migrations.bytecode });

    const variables = {
      bytes: Migrations.bytecode
    };

    // add bytecode
    {
      const data = await client.execute(AddBytecode, { bytes: variables.bytes });
      expect(data).toHaveProperty("bytecodesAdd");

      const { bytecodesAdd } = data;
      expect(bytecodesAdd).toHaveProperty("bytecodes");

      const { bytecodes } = bytecodesAdd;
      expect(bytecodes).toHaveLength(1);

      const bytecode = bytecodes[0];
      expect(bytecode).toHaveProperty("id");

      const { id } = bytecode;
      expect(id).toEqual(expectedId);
    }

    // ensure retrieved as matching
    {
      const data = await client.execute(GetBytecode, { id: expectedId });
      expect(data).toHaveProperty("bytecode");

      const { bytecode } = data;
      expect(bytecode).toHaveProperty("id");
      expect(bytecode).toHaveProperty("bytes");

      const { id, bytes } = bytecode;
      expect(id).toEqual(expectedId);
      expect(bytes).toEqual(variables.bytes);
    }
  });
});

