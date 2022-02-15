import { Storage } from "./storage";
import Config from "@truffle/config";
const path = require("path");

export type TruffleDBConfig = {
  projectName?: string;
  databaseName?: string;
  databaseEngine?: string;
  databaseDirectory?: string;
  modelDirectories?: string[];
};

export type ModelLookup = {
  [model: string]: { exists: Function; get: Function; create: Function };
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

  async getProject(name = this.config.projectName) {
    const { Project } = this.models;

    if (await Project.exists(name)) {
      return await Project.get(name);
    } else {
      return await Project.create({ name });
    }
  }

  getTruffleConfig() {
    let truffleConfig = {};
    let projectConfig = {};
    let userConfig = {};
    try {
      projectConfig = Config.detect().db; // This throws

      const UserConfig: { get: (key: string) => {} } = Config.getUserConfig();
      userConfig = UserConfig.get("db");
      truffleConfig = { ...userConfig, ...projectConfig };
    } catch (e) {
      // debug log this but package has default values.
    }

    return truffleConfig;
  }

  static get DEFAULTS(): TruffleDBConfig {
    return {
      projectName: path.basename(path.resolve()),
      databaseName: "truffledb",
      databaseEngine: "memory",
      databaseDirectory: "./db",
      modelDirectories: []
    };
  }
}
