import { Storage } from "./storage";

type TruffleDBConfig = {
  databaseName: string;
  databaseBackend: string;
  databaseDirectory: string;
};

export class TruffleDB {
  config: TruffleDBConfig;
  levelDB: { close: Function };
  models: { [model: string]: { levelDB: { close: Function } } };

  constructor(config?: TruffleDBConfig) {
    this.config = { ...TruffleDB.DEFAULTS, ...config };
    const { databaseName, databaseBackend, databaseDirectory } = this.config;

    const { levelDB, models } = Storage.createStorage({
      databaseName,
      databaseDirectory,
      databaseBackend
    });

    this.levelDB = levelDB;
    this.models = models;
  }

  async close() {
    await this.levelDB.close();
  }

  static get DEFAULTS(): TruffleDBConfig {
    return {
      databaseName: "truffledb",
      databaseBackend: "memory",
      databaseDirectory: "./db"
    };
  }
}
