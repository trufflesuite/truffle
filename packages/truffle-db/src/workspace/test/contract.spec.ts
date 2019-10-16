import gql from "graphql-tag";
import { generateId, Migrations, WorkspaceClient } from './utils';

import { AddSource } from './source.spec';
import { AddBytecode } from './bytecode.spec';
import { AddCompilation } from './compilation.spec';

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
    const bytecodeVariables = {
      bytes: Migrations.bytecode
    };
    const bytecodeResult = await wsClient.execute(AddBytecode, bytecodeVariables);
    bytecodeId = bytecodeResult.bytecodesAdd.bytecodes[0].id;

    // add compilation and get id
    const compilationVariables = {
      compilerName: Migrations.compiler.name,
      compilerVersion: Migrations.compiler.version,
      sourceId: sourceId,
      abi: JSON.stringify(Migrations.abi)
    };
    const compilationResult = await wsClient.execute(AddCompilation, compilationVariables);
    compilationId = compilationResult.compilationsAdd.compilations[0].id;

  });

  test("can be added", async() => {

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
    expect(contract).toHaveProperty("sourceContract");

    const { sourceContract } = contract;
    expect(sourceContract).toHaveProperty("name");
    expect(sourceContract).toHaveProperty("source");
    expect(sourceContract).toHaveProperty("ast");

  });

  test("can be queried", async() => {
    expectedId = generateId({
      name: Migrations.contractName,
      abi: { json: JSON.stringify(Migrations.abi) } ,
      sourceContract: { index: 0 } ,
      compilation: { id: compilationId }
    });

    const getContractResult = await wsClient.execute(GetContract, { id: expectedId });

    expect(getContractResult).toHaveProperty("contract");

    const { contract } = getContractResult;
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("sourceContract");
    expect(contract).toHaveProperty("abi");

  });

});

export const GetContract = gql`
  query getContract($id:ID!){
      contract(id:$id) {
        name
        abi {
          json
        }
        sourceContract {
          source {
            contents
          }
          ast {
            json
          }
        }
      }
  }
`;


export const AddContracts = gql`
  mutation addContracts($contractName: String, $compilationId: ID!, $bytecodeId:ID!, $abi:String!) {
    contractsAdd(input: {
      contracts: [{
        name: $contractName
        abi: {
          json: $abi
        }
        compilation: {
          id: $compilationId
        }
        sourceContract: {
          index: 0
        }
        constructor: {
          createBytecode: {
            id: $bytecodeId
          }
        }
      }]
    }) {
      contracts {
        id
        name
        sourceContract {
          name
          source {
            contents
          }
          ast {
            json
          }
        }
        constructor {
          createBytecode {
            bytes
          }
        }
      }
    }
  }
`;


