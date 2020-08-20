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
const projects_graphql_1 = require("./projects.graphql");
const network_graphql_1 = require("./network.graphql");
const nameRecord_graphql_1 = require("./nameRecord.graphql");
const contract_graphql_1 = require("./contract.graphql");
describe("Project", () => {
  let wsClient;
  let projectId;
  let addProjectResult;
  let addNetworkId;
  let addContractId;
  let projectNamesAssignNetworkResult;
  let projectNamesAssignContractResult;
  beforeAll(() =>
    __awaiter(void 0, void 0, void 0, function* () {
      wsClient = new utils_1.WorkspaceClient();
      addProjectResult = yield wsClient.execute(projects_graphql_1.AddProject, {
        directory: "test/path"
      });
      projectId = addProjectResult.projectsAdd.projects[0].id;
      // add network and network name record
      let addNetworkResult = yield wsClient.execute(
        network_graphql_1.AddNetworks,
        {
          name: "ganache",
          networkId: Object.keys(utils_1.Migrations.networks)[0],
          height: 1,
          hash:
            "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
        }
      );
      addNetworkId = addNetworkResult.networksAdd.networks[0].id;
      let addNetworkNameRecordResult = yield wsClient.execute(
        nameRecord_graphql_1.AddNameRecord,
        {
          name: "ganache",
          type: "Network",
          resource: {
            id: addNetworkId
          }
        }
      );
      let addNetworkNameRecordId =
        addNetworkNameRecordResult.nameRecordsAdd.nameRecords[0].id;
      //add name records to project
      const networkVariables = {
        projectId,
        name: "ganache",
        type: "Network",
        nameRecordId: addNetworkNameRecordId
      };
      projectNamesAssignNetworkResult = yield wsClient.execute(
        projects_graphql_1.AssignProjectName,
        networkVariables
      );
      // add contract and contract name record
      let addContractResult = yield wsClient.execute(
        contract_graphql_1.AddContracts,
        {
          contractName: "Migrations",
          compilationId: "123",
          bytecodeId: "1234",
          abi: JSON.stringify(utils_1.Migrations.abi)
        }
      );
      addContractId = addContractResult.contractsAdd.contracts[0].id;
      let addContractNameRecordResult = yield wsClient.execute(
        nameRecord_graphql_1.AddNameRecord,
        {
          name: "Migrations",
          type: "Contract",
          resource: {
            id: addContractId
          }
        }
      );
      let addContractNameRecordId =
        addContractNameRecordResult.nameRecordsAdd.nameRecords[0].id;
      const contractVariables = {
        projectId,
        name: "Migrations",
        type: "Contract",
        nameRecordId: addContractNameRecordId
      };
      projectNamesAssignContractResult = yield wsClient.execute(
        projects_graphql_1.AssignProjectName,
        contractVariables
      );
    })
  );
  test("can be added", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      expect(addProjectResult).toHaveProperty("projectsAdd");
      expect(addProjectResult.projectsAdd).toHaveProperty("projects");
      const { projects } = addProjectResult.projectsAdd;
      expect(projects).toHaveLength(1);
      const project = projects[0];
      expect(project.directory).toEqual("test/path");
    }));
  test("can be updated with project names", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      {
        // network
        expect(projectNamesAssignNetworkResult).toHaveProperty(
          "projectNamesAssign"
        );
        const { projectNamesAssign } = projectNamesAssignNetworkResult;
        expect(projectNamesAssign).toHaveProperty("projectNames");
        const { projectNames } = projectNamesAssign;
        const projectName = projectNames[0];
        expect(projectName).toHaveProperty("project");
        expect(projectName).toHaveProperty("nameRecord");
        const { project, nameRecord } = projectName;
        expect(nameRecord.resource.name).toEqual("ganache");
        expect(nameRecord.resource.id).toEqual(addNetworkId);
      }
      {
        // contract
        expect(projectNamesAssignContractResult).toHaveProperty(
          "projectNamesAssign"
        );
        const { projectNamesAssign } = projectNamesAssignContractResult;
        expect(projectNamesAssign).toHaveProperty("projectNames");
        const { projectNames } = projectNamesAssign;
        const projectName = projectNames[0];
        expect(projectName).toHaveProperty("project");
        expect(projectName).toHaveProperty("nameRecord");
        const { project, nameRecord } = projectName;
        expect(nameRecord.resource.name).toEqual("Migrations");
        expect(nameRecord.resource.id).toEqual(addContractId);
      }
    }));
  test("can be queried", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const expectedId = utils_1.generateId({
        directory: "test/path"
      });
      const executionResult = yield wsClient.execute(
        projects_graphql_1.GetProject,
        {
          id: expectedId
        }
      );
      expect(executionResult).toHaveProperty("project");
      const { project } = executionResult;
      expect(project.id).toEqual(expectedId);
      expect(project.directory).toEqual("test/path");
    }));
  test("can be used to lookup names", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const executionResult = yield wsClient.execute(
        projects_graphql_1.LookupNames,
        {
          projectId,
          networkName: "ganache",
          contractName: "Migrations"
        }
      );
      expect(executionResult).toHaveProperty("project");
      const { project } = executionResult;
      expect(project).toHaveProperty("network");
      expect(project).toHaveProperty("contract");
      const { network, contract } = project;
      expect(network.name).toEqual("ganache");
      expect(contract.name).toEqual("Migrations");
    }));
});
//# sourceMappingURL=projects.spec.js.map
