import gql from "graphql-tag";
import * as Meta from "@truffle/db/meta";
import * as Pouch from "./pouch";

export type Collections = {
  sources: {
    resource: DataModel.ISource;
    input: DataModel.ISourceInput;
  };
  bytecodes: {
    resource: DataModel.IBytecode;
    input: DataModel.IBytecodeInput;
  };
  compilations: {
    resource: DataModel.ICompilation;
    input: DataModel.ICompilationInput;
  };
  contractInstances: {
    resource: DataModel.IContractInstance;
    input: DataModel.IContractInstanceInput;
  };
  contracts: {
    resource: DataModel.IContract;
    input: DataModel.IContractInput;
    named: true;
  };
  nameRecords: {
    resource: DataModel.INameRecord;
    input: DataModel.INameRecordInput;
  };
  networks: {
    resource: DataModel.INetwork;
    input: DataModel.INetworkInput;
    named: true;
  };
  projects: {
    resource: DataModel.IProject;
    input: DataModel.IProjectInput;
  };
  projectNames: {
    resource: DataModel.IProjectName;
    input: DataModel.IProjectNameInput;
    mutable: true;
  };
};

export type Definitions = Pouch.Definitions<Collections>;

export type CollectionName = Meta.CollectionName<Collections>;

export type Definition<N extends CollectionName> = Pouch.Definition<
  Collections,
  N
>;

export type Resource<N extends CollectionName = CollectionName> = Meta.Resource<
  Collections,
  N
>;

export type MutableResource<
  N extends CollectionName = CollectionName
> = Meta.MutableResource<Collections, N>;

export type NamedResource<
  N extends CollectionName = CollectionName
> = Meta.NamedResource<Collections, N>;

const sources: Definition<"sources"> = {
  createIndexes: [],
  idFields: ["contents", "sourcePath"],
  typeDefs: {
    resource: gql`
      type Source implements Resource {
        id: ID!
        sourcePath: String
        contents: String!
      }
    `,
    input: gql`
      input SourceInput {
        contents: String!
        sourcePath: String
      }
    `,
    query: gql`
      extend type Query {
        source(id: ID!): Source
        sources: [Source]
      }
    `,
    mutation: gql`
      extend type Mutation {
        sourcesAdd(input: SourcesAddInput!): SourcesAddPayload
      }
    `
  },
  resolvers: {
    Query: {
      source: {
        resolve: (_, { id }, { workspace }) =>
          workspace.databases.get("sources", id)
      },
      sources: {
        resolve: (_, {}, { workspace }) => workspace.databases.all("sources")
      }
    },
    Mutation: {
      sourcesAdd: {
        resolve: (_, { input }, { workspace }) =>
          workspace.databases.add("sources", input)
      }
    }
  }
};

export const definitions: Definitions = {
  sources,
  contracts: {
    createIndexes: [
      {
        fields: ["compilation.id", "processedSource.index"]
      }
    ],
    idFields: ["name", "abi", "processedSource", "compilation"]
  },
  compilations: {
    createIndexes: [],
    idFields: ["compiler", "sources"]
  },
  bytecodes: {
    createIndexes: [],
    idFields: ["bytes", "linkReferences"]
  },
  networks: {
    createIndexes: [],
    idFields: ["networkId", "historicBlock"]
  },
  contractInstances: {
    createIndexes: [],
    idFields: ["address", "network"]
  },
  nameRecords: {
    createIndexes: [],
    idFields: ["name", "type", "resource", "previous"]
  },
  projects: {
    createIndexes: [],
    idFields: ["directory"]
  },
  projectNames: {
    createIndexes: [
      {
        fields: ["project.id"]
      },
      {
        fields: ["project.id", "type"]
      },
      {
        fields: ["project.id", "name", "type"]
      }
    ],
    idFields: ["project", "name", "type"]
  }
};
