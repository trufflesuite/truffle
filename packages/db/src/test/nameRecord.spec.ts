import { logger } from "@truffle/db/logger";
const debug = logger("db:test:nameRecord");

import { generateId, Migrations, WorkspaceClient } from "./utils";
import {
  AddNameRecord,
  GetAllNameRecords,
  GetNameRecord
} from "./nameRecord.graphql";
import { AddNetworks } from "./network.graphql";

describe("Name Record", () => {
  let wsClient;
  let expectedId;
  let variables, addNameRecordResult;

  beforeAll(async () => {
    wsClient = new WorkspaceClient();

    let addNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
    });

    let addNetworkId = addNetworkResult.networksAdd.networks[0].id;

    variables = {
      resource: {
        id: addNetworkId,
        type: "Network"
      }
    };

    expectedId = generateId(variables);

    addNameRecordResult = await wsClient.execute(AddNameRecord, variables);
  });

  test("can be added", async () => {
    expect(addNameRecordResult).toHaveProperty("nameRecordsAdd");

    const { nameRecordsAdd } = addNameRecordResult;
    expect(nameRecordsAdd).toHaveProperty("nameRecords");

    const { nameRecords } = nameRecordsAdd;
    expect(nameRecords).toHaveLength(1);

    const nameRecord = nameRecords[0];
    expect(nameRecord).toHaveProperty("id");

    const { id } = nameRecord;
    expect(id).toEqual(expectedId);
  });

  test("can be queried", async () => {
    const executionResult = await wsClient.execute(GetNameRecord, {
      id: expectedId
    });
    expect(executionResult).toHaveProperty("nameRecord");

    const { nameRecord } = executionResult;
    expect(nameRecord).toHaveProperty("id");

    const { id, resource } = nameRecord;
    expect(id).toEqual(expectedId);
    expect(resource).toHaveProperty("networkId");
    expect(resource.id).toEqual(variables.resource.id);
  });

  test("can retrieve all name records", async () => {
    const executionResult = await wsClient.execute(GetAllNameRecords);
    expect(executionResult).toHaveProperty("nameRecords");

    const { nameRecords } = executionResult;

    expect(nameRecords).toHaveProperty("length");

    nameRecords.forEach(nr => {
      expect(nr).toHaveProperty("id");
      expect(nr).toHaveProperty("resource");
    });
  });
});
