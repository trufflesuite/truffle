import { generateId, Migrations, WorkspaceClient } from "./utils";
import {
  GetProject,
  GetAllProjects,
  AddProject,
  SetProjectNames
} from "./projects.graphql";
import { AddNetworks } from "./network.graphql";
import { AddNameRecord } from "./nameRecord.graphql";
import { AddContracts } from "./contract.graphql";

describe("Project", () => {
  let wsClient;
  let expectedId;
  let addNetworkId,
    addContractId,
    addProjectId,
    addProjectResult,
    networkVariables,
    contractVariables,
    projectNamesSetNetworkResult,
    projectNamesSetContractResult;

  beforeAll(async () => {
    wsClient = new WorkspaceClient();

    // add network and network name record
    let addNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
    });

    addNetworkId = addNetworkResult.networksAdd.networks[0].id;

    let addNetworkNameRecordResult = await wsClient.execute(AddNameRecord, {
      name: "ganache",
      resource: {
        id: addNetworkId,
        type: "Network"
      }
    });

    let addNetworkNameRecordId =
      addNetworkNameRecordResult.nameRecordsAdd.nameRecords[0].id;

    // add contract and contract name record
    let addContractResult = await wsClient.execute(AddContracts, {
      contractName: "Migrations",
      compilationId: "123",
      bytecodeId: "1234",
      abi: JSON.stringify(Migrations.abi)
    });

    addContractId = addContractResult.contractsAdd.contracts[0].id;

    let addContractNameRecordResult = await wsClient.execute(AddNameRecord, {
      name: "Migrations",
      resource: {
        id: addContractId,
        type: "Contract"
      }
    });

    let addContractNameRecordId =
      addContractNameRecordResult.nameRecordsAdd.nameRecords[0].id;

    addProjectResult = await wsClient.execute(AddProject, {
      directory: "test/path"
    });
    console.debug("Add result %o", addProjectResult);

    //add name records to project
    networkVariables = {
      project: {
        directory: "test/path"
      },
      nameRecords: [
        {
          id: addNetworkNameRecordId
        }
      ]
    };

    projectNamesSetNetworkResult = await wsClient.execute(
      SetProjectNames,
      networkVariables
    );

    contractVariables = {
      project: {
        directory: "test/path"
      },
      nameRecords: [
        {
          id: addContractNameRecordId
        }
      ]
    };

    projectNamesSetContractResult = await wsClient.execute(
      SetProjectNames,
      contractVariables
    );
  });

  test("can be added", async () => {
    expect(addProjectResult).toHaveProperty("projectAdd");
    expect(addProjectResult.projectAdd).toHaveProperty("directory");
    expect(addProjectResult.projectAdd).toHaveProperty("id");
    expect(addProjectResult.projectAdd.directory).toEqual("test/path");
  });

  test("can be updated with project names", async () => {
    expect(projectNamesSetNetworkResult).toHaveProperty("projectNamesSet");
    expect(projectNamesSetNetworkResult.projectNamesSet).toHaveProperty(
      "nameRecords"
    );
    expect(projectNamesSetNetworkResult.projectNamesSet).toHaveProperty(
      "project"
    );
    expect(
      projectNamesSetNetworkResult.projectNamesSet.project.names[0].name
    ).toEqual("ganache");
    expect(
      projectNamesSetNetworkResult.projectNamesSet.nameRecords[0].resource.id
    ).toEqual(addNetworkId);

    expect(projectNamesSetContractResult).toHaveProperty("projectNamesSet");
    expect(projectNamesSetContractResult.projectNamesSet).toHaveProperty(
      "nameRecords"
    );
    expect(
      projectNamesSetContractResult.projectNamesSet.project.names[1].name
    ).toEqual("migrations");
    expect(
      projectNamesSetContractResult.projectNamesSet.nameRecords[0].resource.id
    ).toEqual(addContractId);
  });

  test("can be queried", async () => {
    const executionResult = await wsClient.execute(GetProject, {
      directory: "test/path"
    });

    expect(executionResult).toHaveProperty("project");
    const { project } = executionResult;
    expect(project).toHaveProperty("names");
    const { names } = project;
    expect(Array.isArray(names)).toBe(true);
    expect(names[0].name).toEqual("ganache");
    expect(names[1].name).toEqual("migrations");
  });

  test("can retrieve all name records", async () => {
    const executionResult = await wsClient.execute(GetAllProjects);
  });
});
