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
  }
}

export class PouchConnector {
  contractTypes: PouchDB.Database;
  sources: PouchDB.Database;

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

  async addContractType (contractType: { name: string }) {
    await this.ready;

    return await this.contractTypes.put({
      ...contractType,

      _id: contractType.name
    })
  }

  async addContractName ({ name }: { name: string }) {
    await this.ready;

    await this.addContractType({ name });

    return name;
  }

  async source ({ id }: { id: string }) {
    await this.ready;

    return {
      ...await this.sources.get(id),

      id
    };
  }

  async addSource (source: DataModel.ISource): Promise<string> {
    await this.ready;

    const { contents, sourcePath } = source;

    // hash includes sourcePath because two files can have same contents, but
    // should have different IDs
    const _id = soliditySha3(contents, sourcePath);

    await this.sources.put({
      ...source,

      _id
    });

    return _id;
  }
}
