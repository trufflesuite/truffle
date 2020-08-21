"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const db_1 = require("@truffle/db");
const shims_1 = require("@truffle/workflow-compile/shims");
const tmp_1 = __importDefault(require("tmp"));
const fixturesDirectory = path_1.default.join(__dirname, // db/src/test
"..", // db/src/artifacts
"..", // db/src
"..", // db
"test", "fixtures");
const tempDir = tmp_1.default.dirSync({ unsafeCleanup: true });
tmp_1.default.setGracefulCleanup();
// minimal config
const config = {
    contracts_build_directory: fixturesDirectory,
    working_directory: tempDir.name
};
const db = new db_1.TruffleDB(config);
const Migrations = require(path_1.default.join(fixturesDirectory, "Migrations.json"));
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
        processedSource {
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
        processedSource {
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
    it("lists artifact contract names", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield db.query(GetContractNames);
        expect(result).toHaveProperty("data");
        const { data } = result;
        expect(data).toHaveProperty("artifacts");
        const { artifacts } = data;
        expect(artifacts).toHaveProperty("contractNames");
        const { contractNames } = artifacts;
        expect(contractNames).toContain("Migrations");
    }));
    it("retrieves contract correctly", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield db.query(GetContract, {
            name: Migrations.contractName
        });
        const { data } = result;
        expect(data).toHaveProperty("artifacts");
        const { artifacts } = data;
        expect(artifacts).toHaveProperty("contract");
        const { contract } = artifacts;
        expect(contract).toHaveProperty("name");
        expect(contract).toHaveProperty("processedSource");
        const { name, processedSource, abi } = contract;
        expect(name).toEqual(Migrations.contractName);
        expect(processedSource).toHaveProperty("ast");
        expect(processedSource).toHaveProperty("source");
        const { ast, source } = processedSource;
        expect(source).toHaveProperty("contents");
        expect(source).toHaveProperty("sourcePath");
        expect(ast).toHaveProperty("json");
        expect(ast.json).toEqual(JSON.stringify(Migrations.ast));
    }));
    it("retrieves contract bytecodes correctly", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield db.query(GetContractBytecodes, {
            name: Migrations.contractName
        });
        const { data } = result;
        expect(data).toHaveProperty("artifacts");
        const { artifacts } = data;
        expect(artifacts).toHaveProperty("contract");
        const { contract } = artifacts;
        expect(contract).toHaveProperty("name");
        expect(contract).toHaveProperty("abi");
        expect(contract).toHaveProperty("processedSource");
        expect(contract).toHaveProperty("createBytecode");
        expect(contract).toHaveProperty("callBytecode");
        const { name, processedSource, abi, createBytecode, callBytecode } = contract;
        expect(name).toEqual(Migrations.contractName);
        expect(createBytecode).toEqual(shims_1.shimBytecode(Migrations.bytecode));
        expect(callBytecode).toEqual(shims_1.shimBytecode(Migrations.deployedBytecode));
        expect(processedSource).toHaveProperty("source");
        const { source } = processedSource;
        expect(source).not.toEqual(null);
    }));
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
            processedSource {
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
    it("retrieves contract information for an instance", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield db.query(GetContractFromInstance, {
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
        expect(contract).toHaveProperty("processedSource");
        const { name, processedSource, abi } = contract;
        expect(name).toEqual(Migrations.contractName);
        expect(processedSource).toHaveProperty("ast");
        expect(processedSource).toHaveProperty("source");
        const { ast, source } = processedSource;
        expect(source).toHaveProperty("contents");
        expect(source).toHaveProperty("sourcePath");
        expect(name).toEqual(Migrations.contractName);
        const { json } = abi;
        expect(json).toEqual(JSON.stringify(Migrations.abi));
        const { bytecode } = callBytecode;
        const { bytes, linkReferences } = bytecode;
        expect(bytes).toEqual(shims_1.shimBytecode(Migrations.deployedBytecode).bytes);
        expect(linkReferences).toEqual(shims_1.shimBytecode(Migrations.deployedBytecode).linkReferences);
    }));
});
//# sourceMappingURL=index.js.map