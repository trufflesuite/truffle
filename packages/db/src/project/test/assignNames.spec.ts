import { logger } from "@truffle/db/logger";
const debug = logger("db:project:test:assignNames");

import gql from "graphql-tag";

import { Db, Project, connect } from "@truffle/db";
import { DataModel } from "@truffle/db/resources";

const helpers = (db: Db, project: Project) => ({
  async addContract(input: DataModel.ContractInput) {
    const {
      data: {
        contractsAdd: {
          contracts: [contract]
        }
      }
    }: any = await db.execute(
      gql`
        mutation AddContract($input: ContractInput!) {
          contractsAdd(input: { contracts: [$input] }) {
            contracts {
              id
            }
          }
        }
      `,
      { input }
    );

    return contract;
  },

  async resolveContractNameRecord(name: string) {
    const {
      data: {
        project: { resolve }
      }
    }: any = await db.execute(
      gql`
        query ResolveContractNameRecord($name: String!) {
          project(id: "${project.id}") {
            resolve(name: $name, type: "Contract") {
              id
              resource {
                id
              }
              previous {
                id
                resource {
                  id
                }
              }
            }
          }
        }
      `,
      { name }
    );

    debug("resolve %O", resolve);
    const [nameRecord] = resolve;

    return nameRecord;
  }
});

describe("Project.assignNames", () => {
  let db, project;

  beforeAll(async () => {
    const config = {
      working_directory: "/Project.assignNames",
      db: {
        adapter: {
          name: "memory"
        }
      }
    };

    // @ts-ignore
    db = await connect(config);

    project = await Project.initialize({
      db,
      project: {
        directory: config.working_directory
      }
    });
  });

  it("resolves to new contract with no prior contract", async () => {
    const { addContract, resolveContractNameRecord } = helpers(db, project);

    const contract = await addContract({
      name: "A",
      abi: {
        json: "[]"
      }
    });
    debug("contract %o", contract);

    await project.assignNames({
      assignments: {
        contracts: [contract]
      }
    });

    const nameRecord = await resolveContractNameRecord("A");
    debug("nameRecord %o", nameRecord);
    const { resource } = nameRecord;
    debug("resource %o", resource);

    expect(resource).toEqual(contract);
  });

  it("is idempotent", async () => {
    const { addContract, resolveContractNameRecord } = helpers(db, project);

    const contract = await addContract({
      name: "B",
      abi: {
        json: "[]"
      }
    });

    await project.assignNames({
      assignments: {
        contracts: [contract]
      }
    });

    const first = await resolveContractNameRecord("B");

    await project.assignNames({
      assignments: {
        contracts: [contract]
      }
    });

    const second = await resolveContractNameRecord("B");

    expect(second).toEqual(first);
  });

  it("resolves to new contract with prior contract", async () => {
    const { addContract, resolveContractNameRecord } = helpers(db, project);

    const first = await addContract({
      name: "C",
      abi: {
        json: "[]"
      }
    });
    debug("first %o", first);

    await project.assignNames({
      assignments: {
        contracts: [first]
      }
    });

    const second = await addContract({
      name: "C",
      abi: {
        json: `[{ type: "constructor", inputs: [] }]`
      }
    });
    debug("second %o", second);

    await project.assignNames({
      assignments: {
        contracts: [second]
      }
    });

    const { id, resource, previous } = await resolveContractNameRecord("C");
    debug("nameRecord %o", id);
    debug("resource %o", resource);
    debug("previous.resource %o", previous.resource);

    expect(resource).toEqual(second);
    expect(previous.resource).toEqual(first);
  });
});
