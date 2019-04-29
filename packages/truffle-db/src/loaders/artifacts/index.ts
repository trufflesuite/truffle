import gql from "graphql-tag";

import { TruffleDB } from "truffle-db/db";

const GetContractNames = gql`
query GetContractNames {
  artifacts {
    contractNames
  }
}
`;

const GetBytecode = gql`
query GetBytecode($name: String!) {
  artifacts {
    contract(name: $name) {
      constructor {
        createBytecode {
          bytes
        }
      }
    }
  }
}
`;

const AddBytecodes = gql`
input BytecodeInput {
  bytes: Bytes!
}

mutation AddBytecodes($bytecodes: [BytecodeInput!]!) {
  workspace {
    bytecodesAdd(input: {
      bytecodes: $bytecodes
    }) {
      bytecodes {
        id
      }
    }
  }
}`;

const GetSource = gql`
query GetSource($name: String!) {
  artifacts {
    contract(name: $name) {
      sourceContract {
        source {
          contents
          sourcePath
        }
      }
    }
  }
}
`;

const AddSources = gql`
input SourceInput {
      contents: String!
      sourcePath: String
}

mutation AddSource($sources: [SourceInput!]!) {
  workspace {
    sourcesAdd(input: {
      sources: $sources
    }) {
      sources {
        id
        contents
        sourcePath
      }
    }
  }
}`;



export class ArtifactsLoader {
  private db: TruffleDB;

  constructor (db: TruffleDB) {
    this.db = db;
  }

  async load (): Promise<void> {
    const {
      data: {
        artifacts: {
          contractNames
        }
      }
    } = await this.db.query(GetContractNames);

    await this.loadBytecodes(contractNames);
    await this.loadSources(contractNames);
  }

  async loadBytecodes(contractNames: string[]) {
    const createBytecodes = await Promise.all(contractNames.map(
      async (name) =>
        (await this.db.query(GetBytecode, { name }))
          .data
          .artifacts
          .contract
          .constructor
          .createBytecode
    ));

    const bytecodes = [...createBytecodes];

    await this.db.query(AddBytecodes, { bytecodes });
  }

  async loadSources(contractNames: string[]) {
    const contractSources = await Promise.all(contractNames.map(
      async (name) =>
        (await this.db.query(GetSource, { name }))
          .data
          .artifacts
          .contract
          .sourceContract
          .source
    ));

    const sources = [...contractSources];

    await this.db.query(AddSources, { sources });
  }
}
