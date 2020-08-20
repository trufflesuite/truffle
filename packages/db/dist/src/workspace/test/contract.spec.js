"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const shims_1 = require("@truffle/workflow-compile/shims");
const source_graphql_1 = require("./source.graphql");
const bytecode_graphql_1 = require("./bytecode.graphql");
const compilation_graphql_1 = require("./compilation.graphql");
const contract_graphql_1 = require("./contract.graphql");
describe("Contract", () => {
  let wsClient;
  let compilationId;
  let sourceId;
  let bytecodeId;
  let expectedId;
  beforeEach(() =>
    __awaiter(void 0, void 0, void 0, function* () {
      wsClient = new utils_1.WorkspaceClient();
      //add source and get id
      const sourceVariables = {
        contents: utils_1.Migrations.source,
        sourcePath: utils_1.Migrations.sourcePath
      };
      const sourceResult = yield wsClient.execute(
        source_graphql_1.AddSource,
        sourceVariables
      );
      sourceId = sourceResult.sourcesAdd.sources[0].id;
      //add bytecode and get id
      const shimmedBytecode = shims_1.shimBytecode(utils_1.Migrations.bytecode);
      const bytecodeResult = yield wsClient.execute(
        bytecode_graphql_1.AddBytecode,
        shimmedBytecode
      );
      bytecodeId = bytecodeResult.bytecodesAdd.bytecodes[0].id;
      // add compilation and get id
      const compilationVariables = {
        compilerName: utils_1.Migrations.compiler.name,
        compilerVersion: utils_1.Migrations.compiler.version,
        sourceId: sourceId,
        abi: JSON.stringify(utils_1.Migrations.abi),
        sourceMap: JSON.stringify(utils_1.Migrations.sourceMap)
      };
      const compilationResult = yield wsClient.execute(
        compilation_graphql_1.AddCompilation,
        compilationVariables
      );
      compilationId = compilationResult.compilationsAdd.compilations[0].id;
    })
  );
  test("can be added", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const variables = {
        contractName: utils_1.Migrations.contractName,
        compilationId: compilationId,
        bytecodeId: bytecodeId,
        abi: JSON.stringify(utils_1.Migrations.abi)
      };
      const addContractsResult = yield wsClient.execute(
        contract_graphql_1.AddContracts,
        variables
      );
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
    }));
  test("can be queried", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      expectedId = utils_1.generateId({
        name: utils_1.Migrations.contractName,
        abi: { json: JSON.stringify(utils_1.Migrations.abi) },
        processedSource: { index: 0 },
        compilation: { id: compilationId }
      });
      const getContractResult = yield wsClient.execute(
        contract_graphql_1.GetContract,
        {
          id: expectedId
        }
      );
      expect(getContractResult).toHaveProperty("contract");
      const { contract } = getContractResult;
      expect(contract).toHaveProperty("name");
      expect(contract).toHaveProperty("processedSource");
      expect(contract).toHaveProperty("abi");
    }));
  test("can be queried via compilation", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      expectedId = utils_1.generateId({
        name: utils_1.Migrations.contractName,
        abi: { json: JSON.stringify(utils_1.Migrations.abi) },
        processedSource: { index: 0 },
        compilation: { id: compilationId }
      });
      const result = yield wsClient.execute(
        compilation_graphql_1.GetCompilationWithContracts,
        {
          id: compilationId
        }
      );
      expect(result).toHaveProperty("compilation.processedSources");
      const { processedSources } = result.compilation;
      expect(processedSources).toHaveLength(1);
      const processedSource = processedSources[0];
      expect(processedSource).toHaveProperty("contracts");
      const { contracts } = processedSource;
      expect(contracts).toHaveLength(1);
      expect(contracts[0].id).toEqual(expectedId);
    }));
  test("can retrieve all contracts", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const getAllContractsResult = yield wsClient.execute(
        contract_graphql_1.GetAllContracts,
        {}
      );
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
    }));
});
//# sourceMappingURL=contract.spec.js.map
