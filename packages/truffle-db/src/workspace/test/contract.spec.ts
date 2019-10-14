import { generateId, Migrations, WorkspaceClient } from './utils';
import { Query, Mutation } from './queries';

const { AddSource, AddBytecode, AddCompilation, AddContracts } = Mutation;
const { GetContract } = Query;

describe("Contract", () => {
  const client = new WorkspaceClient();

  let compilationId;
  let sourceId;
  let bytecodeId;
  let expectedId;

  beforeEach(async () => {
    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    };
    const sourceResult = await client.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;

    //add bytecode and get id
    const bytecodeVariables = {
      bytes: Migrations.bytecode
    };
    const bytecodeResult = await client.execute(AddBytecode, bytecodeVariables);
    bytecodeId = bytecodeResult.bytecodesAdd.bytecodes[0].id;

    // add compilation and get id
    const compilationVariables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi)
    };
    const compilationResult = await client.execute(AddCompilation, compilationVariables);
    compilationId = compilationResult.compilationsAdd.compilations[0].id;

  });


  it("adds contracts", async () => {
    const client = new WorkspaceClient();

    const expectedId = generateId({
      name: Migrations.contractName,
      abi: { json: JSON.stringify(Migrations.abi) } ,
      sourceContract: { index: 0 } ,
      compilation: { id: compilationId }
    });

    const variables = {
      contractName: Migrations.contractName,
      compilationId: compilationId,
      bytecodeId: bytecodeId,
      abi: JSON.stringify(Migrations.abi)
    };

    // add contracts
    {
      const data = await client.execute(AddContracts, variables);

      expect(data).toHaveProperty("contractsAdd");

      const { contractsAdd } = data;
      expect(contractsAdd).toHaveProperty("contracts");

      const { contracts } = contractsAdd;
      expect(contracts).toHaveLength(1);

      const contract = contracts[0];

      expect(contract).toHaveProperty("id");
      expect(contract).toHaveProperty("name");
      expect(contract).toHaveProperty("sourceContract");

      const { sourceContract } = contract;
      expect(sourceContract).toHaveProperty("name");
      expect(sourceContract).toHaveProperty("source");
      expect(sourceContract).toHaveProperty("ast");
    }

    //ensure retrieved as matching
    {
      const data = await client.execute(GetContract, { id: expectedId });

      expect(data).toHaveProperty("contract");

      const { contract } = data;
      expect(contract).toHaveProperty("name");
      expect(contract).toHaveProperty("sourceContract");
      expect(contract).toHaveProperty("abi");
    }
  });
});

