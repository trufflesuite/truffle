const levelup = require("levelup");
const sublevel = require("subleveldown");
const fs = require("fs");

import { StorageBackend } from "./backend";

type CreateStorageOptions = {
  databaseEngine: string;
  databaseDirectory: string;
  databaseName?: string;
};

export class Storage {
  static modelDirectory = `${__dirname}/models`;
  static modelBaseName = ".model.js";
  static availableBackends: string[] = StorageBackend.availableBackends();

  static createStorage({
    databaseEngine,
    databaseDirectory,
    databaseName
  }: CreateStorageOptions) {
    const modelFiles = this.getModelFilesFromDirectory(this.modelDirectory);
    const models = this.createModelsFromFiles(modelFiles);

    const levelDB = this.createDB({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    this.attachModelsToDatabase(models, levelDB);

    return { levelDB, models };
  }

  static createDB({
    databaseEngine,
    databaseDirectory,
    databaseName
  }: CreateStorageOptions) {
    const levelDB = sublevel(
      levelup(StorageBackend.createBackend(databaseEngine, databaseDirectory)),
      databaseName,
      {
        valueEncoding: "json"
      }
    );

    return levelDB;
  }

  static getModelFilesFromDirectory(folder: string): string[] {
    if (!folder || !fs.existsSync(folder))
      throw new Error("folder does not exist");

    return fs
      .readdirSync(folder)
      .filter((file: string) => {
        return file.indexOf(this.modelBaseName) !== -1;
      })
      .map((file: string) => {
        return `${folder}/${file}`;
      });
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

  static attachModelsToDatabase(models: object, levelDB: typeof levelup) {
    Object.values(models).forEach(model => {
      model.setLevelDB(levelDB);
    });
  }
}
