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

  async addContractName ({ name }: { name: string }) {
    await this.ready;

    await this.addContractType({ name });

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

  async addSource (source: DataModel.ISource): Promise<string> {
    await this.ready;

    const { contents, sourcePath } = source;

    // hash includes sourcePath because two files can have same contents, but
    // should have different IDs
    const _id = soliditySha3(contents, sourcePath);

    const { _rev } = await this.source({ id: _id }) || { _rev: null };

    await this.sources.put({
      ...source,

      _id,
      _rev
    });

    return _id;
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

  async addBytecode (bytecode: {
    bytes: string
  }) {
    await this.ready;

    const { bytes } = bytecode;

    const _id = soliditySha3(bytes);

    const { _rev } = await this.bytecode({ id: _id }) || { _rev: null };

    await this.bytecodes.put({
      ...bytecode,

      _id,
      _rev
    });

    return _id;
  }
}
