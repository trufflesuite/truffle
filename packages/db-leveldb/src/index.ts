import { Storage } from "./storage";
import Config from "@truffle/config";

export type TruffleDBConfig = {
  databaseName?: string;
  databaseEngine?: string;
  databaseDirectory?: string;
  modelDirectories?: string[];
};

export type ModelLookup = {
  [model: string]: { levelDB: { close: Function } };
};

export class TruffleDB {
  config: TruffleDBConfig;
  levelDB: { close: Function };
  models: ModelLookup;

  constructor(config?: TruffleDBConfig) {
    const truffleConfig = this.getTruffleConfig();
    this.config = { ...TruffleDB.DEFAULTS, ...truffleConfig, ...config };

    const {
      databaseName,
      databaseEngine,
      databaseDirectory,
      modelDirectories
    } = this.config;

    const { levelDB, models } = Storage.createStorage({
      databaseName,
      databaseDirectory,
      databaseEngine,
      modelDirectories
    });

    this.levelDB = levelDB;
    this.models = models;
  }

  async close() {
    await this.levelDB.close();
  }

  getTruffleConfig() {
    let truffleConfig = {};
    let projectConfig = {};
    let userConfig = {};
    try {
      projectConfig = Config.detect(); // This throws
      const UserConfig: { get: (key: string) => {} } = Config.getUserConfig();
      userConfig = UserConfig.get("db");
    } catch (e) {
      // debug log this but package has default values.
    }

    truffleConfig = { ...userConfig, ...projectConfig };

    return truffleConfig;
  }

  static get DEFAULTS(): TruffleDBConfig {
    return {
      databaseName: "truffledb",
      databaseEngine: "memory",
      databaseDirectory: "./db",
      modelDirectories: []
    };
  }
}
