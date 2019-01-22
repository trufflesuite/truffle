import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";
import PouchDBFind from "pouchdb-find";

const resources = {
  contractTypes: {
    index: {
      fields: ["name"]
    }
  }
}

export class PouchConnector {
  contractTypes: PouchDB.Database;

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
      // maybe create index
      const { index } = definition;
      if (index) {
        const db = this[resource];

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

  async addContractName (name: string) {
    await this.ready;

    await this.addContractType({ name });

    return name;
  }
}
