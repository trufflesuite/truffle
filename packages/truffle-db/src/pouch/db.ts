import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";
import PouchDBFind from "pouchdb-find";

import { soliditySha3 } from "web3-utils";

const resources = {
  contractTypes: {
    createIndexes: [
      { fields: ["name"] }
    ]
  },
  sources: {
    createIndexes: [
      { fields: ["contents"] },
      { fields: ["sourcePath"] },
    ]
  },
  bytecodes: {
    createIndexes: [
    ]
  }
}

export class PouchConnector {
  contractTypes: PouchDB.Database;
  sources: PouchDB.Database;
  bytecodes: PouchDB.Database;

  private ready: Promise<void>;

  constructor () {
    PouchDB.plugin(PouchDBMemoryAdapter);
    PouchDB.plugin(PouchDBFind);

    for (let resource of Object.keys(resources)) {
      this[resource] = new PouchDB(resource, { adapter: "memory" });
    }

    this.ready = this.initialize();
  }

  async initialize() {
    for (let [resource, definition] of Object.entries(resources)) {
      const db = this[resource];

      const { createIndexes } = definition;

      for (let index of (createIndexes || [])) {
        await db.createIndex({ index });
      }
    }
  }

  async contractNames () {
    await this.ready;

    const { docs }: any = await this.contractTypes.find({
      selector: {},
      fields: ['name']
    })
    return docs.map( ({ name }) => name );
  }

  async contractType ({ name }: { name: string }) {
    await this.ready;

    try {
      const result = {
        ...await this.contractTypes.get(name)
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  async addContractType (contractType: {
    name: string,
    abi?: string,
    createBytecode?: string
  }) {
    await this.ready;

    const { name, abi, createBytecode } = contractType;

    const { _rev } = await this.contractType({ name }) || { _rev: null };

    await this.contractTypes.put({
      name,
      abi: {
        json: abi
      },
      createBytecode: {
        id: createBytecode
      },

      _rev,
      _id: contractType.name
    });

    return name;
  }

  async source ({ id }: { id: string }) {
    await this.ready;

    try {
      return {
        ...await this.sources.get(id),

        id
      };
    } catch (_) {
      return null;
    }
  }

  async sourcesAdd ({ input }) {
    await this.ready;

    const { sources } = input;

    return {
      sources: Promise.all(sources.map(
        async (sourceInput) => {
          const { contents, sourcePath } = sourceInput;
          // hash includes sourcePath because two files can have same contents, but
          // should have different IDs
          const id = (sourcePath)
            ? soliditySha3(contents, sourcePath)
            : soliditySha3(contents)

          const source = await this.source({ id }) || { ...sourceInput, id };

          await this.sources.put({
            ...source,
            ...sourceInput,

            _id: id
          });

          return source;
        }
      ))
    };
  }

  async bytecode ({ id }: { id: string }) {
    await this.ready;

    try {
      return {
        ...await this.bytecodes.get(id),

        id
      };
    } catch (_) {
      return null;
    }
  }

  async bytecodesAdd ({ input }) {
    await this.ready;

    const { bytecodes } = input;

    return {
      bytecodes: await Promise.all(bytecodes.map(
        async (bytecodeInput) => {
          const { bytes } = bytecodeInput;

          const id = soliditySha3(bytes);

          const bytecode = await this.bytecode({ id }) || { ...bytecodeInput, id };

          await this.bytecodes.put({
            ...bytecode,
            ...bytecodeInput,

            _id: id
          });

          return bytecode;
        }
      ))
    };
  }
}
