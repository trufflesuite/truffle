import { logger } from "@truffle/db/logger";
const debug = logger("db:test:projects");

import { generateId, Migrations, WorkspaceClient } from "./utils";
import {
  GetProject,
  LookupNames,
  AddProject,
  AssignProjectName
} from "./projects.graphql";
import { AddNetworks } from "./network.graphql";
import { AddNameRecord } from "./nameRecord.graphql";
import { AddContracts } from "./contract.graphql";

describe("Project", () => {
  let wsClient;
  let projectId;
  let addProjectResult;
  let addNetworkId;
  let addContractId;
  let projectNamesAssignNetworkResult;
  let projectNamesAssignContractResult;

  beforeAll(async () => {
    wsClient = new WorkspaceClient();

    addProjectResult = await wsClient.execute(AddProject, {
      directory: "test/path"
    });

    projectId = addProjectResult.projectsAdd.projects[0].id;

    // add network and network name record
    let addNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
    });

    addNetworkId = addNetworkResult.networksAdd.networks[0].id;

    let addNetworkNameRecordResult = await wsClient.execute(AddNameRecord, {
      resource: {
        id: addNetworkId,
        type: "Network"
      }
    });

    debug(
      "addNetworkNameRecordResult %O",
      addNetworkNameRecordResult.nameRecordsAdd.nameRecords
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

    projectNamesAssignNetworkResult = await wsClient.execute(
      AssignProjectName,
      networkVariables
    );

    debug(
      "projectNamesAssignNetworkResult %O",
      projectNamesAssignNetworkResult.projectNamesAssign
    );

    // add contract and contract name record
    let addContractResult = await wsClient.execute(AddContracts, {
      contractName: "Migrations",
      compilationId: "123",
      bytecodeId: "1234",
      abi: JSON.stringify(Migrations.abi)
    });

    debug("addContractResult %O", addContractResult.contractsAdd.contracts);

    addContractId = addContractResult.contractsAdd.contracts[0].id;

    let addContractNameRecordResult = await wsClient.execute(AddNameRecord, {
      resource: {
        id: addContractId,
        type: "Contract"
      }
    });

    let addContractNameRecordId =
      addContractNameRecordResult.nameRecordsAdd.nameRecords[0].id;

    const contractVariables = {
      projectId,
      name: "Migrations",
      type: "Contract",
      nameRecordId: addContractNameRecordId
    };

    projectNamesAssignContractResult = await wsClient.execute(
      AssignProjectName,
      contractVariables
    );
  });

  test("can be added", async () => {
    expect(addProjectResult).toHaveProperty("projectsAdd");
    expect(addProjectResult.projectsAdd).toHaveProperty("projects");
    const { projects } = addProjectResult.projectsAdd;
    expect(projects).toHaveLength(1);
    const project = projects[0];
    expect(project.directory).toEqual("test/path");
  });

  test("can be updated with project names", async () => {
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
      const { nameRecord } = projectName;
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
      const { nameRecord } = projectName;
      expect(nameRecord.resource.name).toEqual("Migrations");
      expect(nameRecord.resource.id).toEqual(addContractId);
    }
  });

  test("can be queried", async () => {
    const expectedId = generateId({
      directory: "test/path"
    });

    const executionResult = await wsClient.execute(GetProject, {
      id: expectedId
    });

    expect(executionResult).toHaveProperty("project");
    const { project } = executionResult;

    expect(project.id).toEqual(expectedId);
    expect(project.directory).toEqual("test/path");
  });

  test("can be used to lookup names", async () => {
    const executionResult = await wsClient.execute(LookupNames, {
      projectId,
      networkName: "ganache",
      contractName: "Migrations"
    });

    expect(executionResult).toHaveProperty("project");
    const { project } = executionResult;

    debug("project %O", project);

    expect(project).toHaveProperty("network");
    expect(project).toHaveProperty("contract");
    const { network, contract } = project;

    expect(network.name).toEqual("ganache");
    expect(contract.name).toEqual("Migrations");
  });
});
