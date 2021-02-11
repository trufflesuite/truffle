import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projects");

import gql from "graphql-tag";

import type { IdObject, Definition } from "@truffle/db/resources/types";
import { resolveNameRecords } from "./resolveNameRecords";
import { resolveContractInstances } from "./resolveContractInstances";

export const projects: Definition<"projects"> = {
  names: {
    resource: "project",
    Resource: "Project",
    resources: "projects",
    Resources: "Projects",
    resourcesMutate: "projectsAdd",
    ResourcesMutate: "ProjectsAdd"
  },
  createIndexes: [],
  idFields: ["directory"],
  typeDefs: gql`
    type Project implements Resource {
      directory: String!

      contract(name: String!): Contract
      contracts: [Contract!]!

      network(name: String!): Network
      networks: [Network!]!

      contractInstance(
        contract: ResourceNameInput
        address: Address
        network: ResourceNameInput!
      ): ContractInstance
      contractInstances(
        contract: ResourceNameInput
        network: ResourceNameInput
      ): [ContractInstance!]!

      resolve(type: String, name: String): [NameRecord!] # null means unknown type
    }

    input ProjectInput {
      directory: String!
    }
  `,
  resolvers: {
    Project: {
      resolve: {
        resolve: async (...args) => {
          debug("Resolving Project.resolve...");

          const result = await resolveNameRecords(...args);

          debug("Resolved Project.resolve.");
          return result;
        }
      },
      network: {
        resolve: async (project, { name }, { workspace }) => {
          debug("Resolving Project.network...");

          const [nameRecord] = await resolveNameRecords(
            project,
            { name, type: "Network" },
            { workspace }
          );

          if (!nameRecord) {
            return;
          }

          const { resource } = nameRecord;

          const result = await workspace.get("networks", resource.id);

          debug("Resolved Project.network.");
          return result;
        }
      },
      networks: {
        resolve: async (project, _, { workspace }) => {
          debug("Resolving Project.networks...");

          const nameRecords = await resolveNameRecords(
            project,
            { type: "Network" },
            { workspace }
          );

          const result = await workspace.find(
            "networks",
            nameRecords.map(nameRecord =>
              nameRecord
                ? (nameRecord.resource as IdObject<"networks">)
                : undefined
            )
          );

          debug("Resolved Project.networks.");
          return result;
        }
      },
      contract: {
        resolve: async (project, inputs, { workspace }) => {
          debug("Resolving Project.contract...");

          const [nameRecord] = await resolveNameRecords(project, inputs, {
            workspace
          });

          if (!nameRecord) {
            return;
          }

          const { resource } = nameRecord;

          const result = await workspace.get("contracts", resource.id);

          debug("Resolved Project.contract.");
          return result;
        }
      },
      contracts: {
        resolve: async (project, _, { workspace }) => {
          debug("Resolving Project.contracts...");

          const nameRecords = await resolveNameRecords(
            project,
            { type: "Contract" },
            { workspace }
          );

          const result = await workspace.find(
            "contracts",
            nameRecords.map(nameRecord =>
              nameRecord
                ? (nameRecord.resource as IdObject<"contracts">)
                : undefined
            )
          );

          debug("Resolved Project.contracts.");
          return result;
        }
      },
      contractInstance: {
        async resolve(project, inputs, context, info) {
          debug("Resolving Project.contractInstance...");

          const [result] = await resolveContractInstances(
            project,
            inputs,
            context,
            info
          );

          debug("Resolved Project.contractInstance.");
          return result;
        }
      },
      contractInstances: {
        async resolve(project, inputs, context, info) {
          debug("Resolving Project.contractInstances...");

          const result = await resolveContractInstances(
            project,
            inputs,
            context,
            info
          );

          debug("Resolved Project.contractInstances.");
          return result;
        }
      }
    }
  }
};
