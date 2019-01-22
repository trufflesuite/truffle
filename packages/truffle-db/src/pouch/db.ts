import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";


export class PouchConnector {
  db: PouchDB.Database;

  constructor () {
    PouchDB.plugin(PouchDBMemoryAdapter);
    this.db = new PouchDB("db", { adapter: "memory" });
  }

  async contractNames () {
    try {
      const { contractNames } = await this.db.get("contractNames");
      return contractNames;
    } catch (_) {
      return [];
    }
  }

  async addContractName (name: string) {
    const contractNames = Array.from(new Set([
      ...await this.contractNames(),
      name
    ]));

    await this.db.put({
      _id: "contractNames",
      contractNames
    });

    return name;
  }
}
