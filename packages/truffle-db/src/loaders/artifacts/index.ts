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
}
