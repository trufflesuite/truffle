import fs from "fs";
import path from "path";
import { TruffleDB } from "truffle-db";
import { shimBytecode } from "@truffle/workflow-compile/shims";
import tmp from "tmp";

const fixturesDirectory = path.join(
  __dirname, // truffle-db/src/test
  "..", // truffle-db/src/artifacts
  "..", // truffle-db/src
  "..", // truffle-db
  "test",
  "fixtures"
);

const tempDir = tmp.dirSync({ unsafeCleanup: true });
tmp.setGracefulCleanup();

// minimal config
const config = {
  contracts_build_directory: fixturesDirectory,
  working_directory: tempDir.name
};

const db = new TruffleDB(config);
const Migrations = require(path.join(fixturesDirectory, "Migrations.json"));

const GetContractNames = `
  query GetContractNames {
    artifacts {
      contractNames
    }
  }`;

const GetContract = `
  query GetContract($name: String!) {
    artifacts {
      contract(name: $name) {
        name
        sourceContract {
          name
          source {
            contents
            sourcePath
          }
          ast {
            json
          }
        }
        abi {
          json
        }
      }
    }
  }`;

const GetContractBytecodes = `
  query getContractBytecodes($name: String!) {
    artifacts {
      contract(name: $name) {
        name
        sourceContract {
          name
          source {
            contents
            sourcePath
          }
        }
        createBytecode {
          bytes
          linkReferences {
            offsets
            name
            length
          }
        }
        callBytecode {
          bytes
          linkReferences {
            offsets
            name
            length
          }
        }
        abi {
          json
        }
      }
    }
  }`;

afterAll(() => {
  tempDir.removeCallback();
});

describe("Artifacts queries", () => {
  it("lists artifact contract names", async () => {
    const result = await db.query(GetContractNames);
    expect(result).toHaveProperty("data");

    const { data } = result;
    expect(data).toHaveProperty("artifacts");

    const { artifacts } = data;
    expect(artifacts).toHaveProperty("contractNames");

    const { contractNames } = artifacts;
    expect(contractNames).toContain("Migrations");
  });

  it("retrieves contract correctly", async () => {
    const result = await db.query(GetContract, {
      name: Migrations.contractName
    });

    const { data } = result;
    expect(data).toHaveProperty("artifacts");

    const { artifacts } = data;
    expect(artifacts).toHaveProperty("contract");

    const { contract } = artifacts;
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("sourceContract");

    const { name, sourceContract, abi } = contract;
    expect(name).toEqual(Migrations.contractName);
    expect(sourceContract).toHaveProperty("name");
    expect(sourceContract).toHaveProperty("ast");
    expect(sourceContract).toHaveProperty("source");

    const { ast, source } = sourceContract;
    expect(source).toHaveProperty("contents");
    expect(source).toHaveProperty("sourcePath");

    expect(ast).toHaveProperty("json");
    expect(ast.json).toEqual(JSON.stringify(Migrations.ast));
  });

  it("retrieves contract bytecodes correctly", async () => {
    const result = await db.query(GetContractBytecodes, {
      name: Migrations.contractName
    });
    const { data } = result;
    expect(data).toHaveProperty("artifacts");

    const { artifacts } = data;
    expect(artifacts).toHaveProperty("contract");

    const { contract } = artifacts;
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("abi");
    expect(contract).toHaveProperty("sourceContract");
    expect(contract).toHaveProperty("createBytecode");
    expect(contract).toHaveProperty("callBytecode");

    const {
      name,
      sourceContract,
      abi,
      createBytecode,
      callBytecode
    } = contract;
    expect(name).toEqual(Migrations.contractName);
    expect(createBytecode).toEqual(shimBytecode(Migrations.bytecode));
    expect(callBytecode).toEqual(shimBytecode(Migrations.deployedBytecode));

    expect(sourceContract).toHaveProperty("name");
    expect(sourceContract).toHaveProperty("source");
    const { source } = sourceContract;
    expect(source).not.toEqual(null);
  });

  const GetContractFromInstance = `
    query GetContractFromInstance($name: String!, $networkId: String!) {
      artifacts {
        contractInstance(name: $name, networkId: $networkId) {
          callBytecode {
            bytecode {
              bytes
              linkReferences {
                offsets
                name
                length
              }
            }
          }
          contract {
            name
            sourceContract {
              name
              source {
                contents
                sourcePath
              }
              ast {
                json
              }
            }
            abi {
              json
            }
          }
        }
      }
    }`;

  it("retrieves contract information for an instance", async () => {
    const result = await db.query(GetContractFromInstance, {
      name: Migrations.contractName,
      networkId: Object.keys(Migrations.networks)[0]
    });

    const { data } = result;
    expect(data).toHaveProperty("artifacts");

    const { artifacts } = data;
    expect(artifacts).toHaveProperty("contractInstance");

    const { contractInstance } = artifacts;
    expect(contractInstance).toHaveProperty("contract");

    const { contract, callBytecode } = contractInstance;
    expect(contract).toHaveProperty("name");
    expect(contract).toHaveProperty("abi");
    expect(contract).toHaveProperty("sourceContract");

    const { name, sourceContract, abi } = contract;
    expect(name).toEqual(Migrations.contractName);
    expect(sourceContract).toHaveProperty("name");
    expect(sourceContract).toHaveProperty("ast");
    expect(sourceContract).toHaveProperty("source");

    const { ast, source } = sourceContract;
    expect(source).toHaveProperty("contents");
    expect(source).toHaveProperty("sourcePath");
    expect(name).toEqual(Migrations.contractName);

    const { json } = abi;
    expect(json).toEqual(JSON.stringify(Migrations.abi));

    const { bytecode } = callBytecode;
    const { bytes, linkReferences } = bytecode;
    expect(bytes).toEqual(shimBytecode(Migrations.deployedBytecode).bytes);
    expect(linkReferences).toEqual(
      shimBytecode(Migrations.deployedBytecode).linkReferences
    );
  });
});
