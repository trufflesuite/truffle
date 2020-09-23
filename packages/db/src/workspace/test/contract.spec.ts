import { generateId, Migrations, WorkspaceClient } from "./utils";
import { AddSource } from "./source.graphql";
import { AddBytecode } from "./bytecode.graphql";
import {
  AddCompilation,
  GetCompilationWithContracts
} from "./compilation.graphql";
import { AddContracts, GetContract, GetAllContracts } from "./contract.graphql";
import { Shims } from "@truffle/compile-common";

describe("Contract", () => {
  let wsClient;

  let compilationId;
  let sourceId;
  let bytecodeId;
  let expectedId;

  beforeEach(async () => {
    wsClient = new WorkspaceClient();

    //add source and get id
    const sourceVariables = {
      contents: Migrations.source,
      sourcePath: Migrations.sourcePath
    };
    const sourceResult = await wsClient.execute(AddSource, sourceVariables);
    sourceId = sourceResult.sourcesAdd.sources[0].id;

    //add bytecode and get id
    const shimmedBytecode = Shims.LegacyToNew.forBytecode(Migrations.bytecode);

    const bytecodeResult = await wsClient.execute(AddBytecode, shimmedBytecode);
    bytecodeId = bytecodeResult.bytecodesAdd.bytecodes[0].id;

    // add compilation and get id
    const compilationVariables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi),
      sourceMap: JSON.stringify(Migrations.sourceMap)
    };
    const compilationResult = await wsClient.execute(
      AddCompilation,
      compilationVariables
    );
    compilationId = compilationResult.compilationsAdd.compilations[0].id;
  });

  test("can be added", async () => {
    const variables = {
      contractName: Migrations.contractName,
      compilationId: compilationId,
      bytecodeId: bytecodeId,
      abi: JSON.stringify(Migrations.abi)
    };
    const addContractsResult = await wsClient.execute(AddContracts, variables);

    expect(addContractsResult).toHaveProperty("contractsAdd");

    const { contractsAdd } = addContractsResult;
    expect(contractsAdd).toHaveProperty("contracts");

    const { contracts } = contractsAdd;
    expect(contracts).toHaveLength(1);

    const contract = contracts[0];

    expect(contract).toHaveProperty("id");
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("processedSource");

    const { processedSource } = contract;
    expect(processedSource).toHaveProperty("source");
    expect(processedSource).toHaveProperty("ast");
  });

  test("can be queried", async () => {
    expectedId = generateId({
      name: Migrations.contractName,
      abi: { json: JSON.stringify(Migrations.abi) },
      processedSource: { index: 0 },
      compilation: { id: compilationId }
    });

    const getContractResult = await wsClient.execute(GetContract, {
      id: expectedId
    });

    expect(getContractResult).toHaveProperty("contract");

    const { contract } = getContractResult;
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("processedSource");
    expect(contract).toHaveProperty("abi");
  });

  test("can be queried via compilation", async () => {
    expectedId = generateId({
      name: Migrations.contractName,
      abi: { json: JSON.stringify(Migrations.abi) },
      processedSource: { index: 0 },
      compilation: { id: compilationId }
    });

    const result = await wsClient.execute(GetCompilationWithContracts, {
      id: compilationId
    });

    expect(result).toHaveProperty("compilation.processedSources");
    const { processedSources } = result.compilation;
    expect(processedSources).toHaveLength(1);

    const processedSource = processedSources[0];
    expect(processedSource).toHaveProperty("contracts");

    const { contracts } = processedSource;
    expect(contracts).toHaveLength(1);

    expect(contracts[0].id).toEqual(expectedId);
  });

  test("can retrieve all contracts", async () => {
    const getAllContractsResult = await wsClient.execute(GetAllContracts, {});

    expect(getAllContractsResult).toHaveProperty("contracts");

    const { contracts } = getAllContractsResult;
    expect(contracts).toHaveProperty("length");

    const firstContract = contracts[0];

    expect(firstContract).toHaveProperty("name");
    expect(firstContract).toHaveProperty("processedSource");
    expect(firstContract).toHaveProperty("abi");
    expect(firstContract).toHaveProperty("abi.json");
    expect(firstContract).toHaveProperty("compilation");
    expect(firstContract).toHaveProperty("compilation.compiler.version");
    expect(firstContract).toHaveProperty("processedSource.source.sourcePath");
  });
});
