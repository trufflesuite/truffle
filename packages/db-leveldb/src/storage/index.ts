const levelup = require("levelup");
const sublevel = require("subleveldown");
const fs = require("fs");

import { StorageBackend } from "./backend";

type CreateStorageOptions = {
  databaseEngine?: string;
  databaseDirectory?: string;
  databaseName?: string;
  modelDirectories?: string[];
};

export class Storage {
  static #modelDirectories = [`${__dirname}/models`];
  static modelBaseName = ".model.js";
  static availableBackends: string[] = StorageBackend.availableBackends();

  static createStorage({
    databaseEngine,
    databaseDirectory,
    databaseName,
    modelDirectories
  }: CreateStorageOptions) {
    this.addModelDirectories(modelDirectories);
    const modelFiles = this.getModelFiles(this.#modelDirectories);
    const models = this.createModelsFromFiles(modelFiles);

    const levelDB = this.createDB({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    this.attachDatabaseToModels(models, levelDB);

    return { levelDB, models };
  }

  static createDB({
    databaseEngine,
    databaseDirectory,
    databaseName
  }: CreateStorageOptions) {
    const backend = StorageBackend.createBackend(databaseEngine, databaseDirectory);
    
    let levelDB;
    switch (databaseEngine) {
      case "memory":
        levelDB = sublevel(
          levelup(backend),
          databaseName,
          {
            valueEncoding: "json"
          }
        );
      break;
      case "leveldb":
        levelDB = sublevel(
          backend,
          databaseName,
          {
            valueEncoding: "json"
          }
        );
      break;

    }
    

    return levelDB;
  }

  static addModelDirectories(directories: string[] | undefined) {
    if (!directories) return;
    if (!Array.isArray(directories))
      throw new Error("Model directories is not an array");

    this.#modelDirectories = Array.from(
      new Set(this.#modelDirectories.concat(directories))
    );
  }

  static get modelDirectories() {
    return this.#modelDirectories;
  }

  static getModelFiles(directories: string[]): string[] {
    if (!directories || !Array.isArray(directories))
      throw new Error("no model directories provided");

    return directories.reduce((files, directory) => {
      if (!fs.existsSync(directory))
        throw new Error("directory does not exist");

      return files.concat(
        fs
          .readdirSync(directory)
          .filter((file: string) => {
            return file.indexOf(this.modelBaseName) !== -1;
          })
          .map((file: string) => {
            return `${directory}/${file}`;
          })
      );
    }, []);
  }

  static createModelsFromFiles(files: string[]) {
    if (!files || !Array.isArray(files) || files.length === 0)
      throw new Error("files parameter is not an array of model paths");

    return files
      .map(file => {
        const model = require(file);
        return model;
      })
      .reduce((lookup, model) => {
        lookup[model.name] = model;
        return lookup;
      }, {});
  }

  static attachDatabaseToModels(models: object, levelDB: typeof levelup) {
    Object.values(models).forEach(model => {
      model.setModels(models);
      model.setLevelDB(levelDB);
    });
  }
  static get DEFAULTS(): CreateStorageOptions {
    return {
      databaseEngine: "memory",
      databaseDirectory: "./db",
      databaseName: "truffledb",
      modelDirectories: []
    };
  }
}
