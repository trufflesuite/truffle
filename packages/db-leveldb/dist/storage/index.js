"use strict";
var __classPrivateFieldGet =
  (this && this.__classPrivateFieldGet) ||
  function (receiver, state, kind, f) {
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a getter");
    if (
      typeof state === "function"
        ? receiver !== state || !f
        : !state.has(receiver)
    )
      throw new TypeError(
        "Cannot read private member from an object whose class did not declare it"
      );
    return kind === "m"
      ? f
      : kind === "a"
      ? f.call(receiver)
      : f
      ? f.value
      : state.get(receiver);
  };
var __classPrivateFieldSet =
  (this && this.__classPrivateFieldSet) ||
  function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a setter");
    if (
      typeof state === "function"
        ? receiver !== state || !f
        : !state.has(receiver)
    )
      throw new TypeError(
        "Cannot write private member to an object whose class did not declare it"
      );
    return (
      kind === "a"
        ? f.call(receiver, value)
        : f
        ? (f.value = value)
        : state.set(receiver, value),
      value
    );
  };
var _a, _Storage_modelDirectories;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Storage = void 0;
const levelup = require("levelup");
const sublevel = require("subleveldown");
const fs = require("fs");
const backend_1 = require("./backend");
class Storage {
  static createStorage({
    databaseEngine,
    databaseDirectory,
    databaseName,
    modelDirectories
  }) {
    this.addModelDirectories(modelDirectories);
    const modelFiles = this.getModelFiles(
      __classPrivateFieldGet(this, _a, "f", _Storage_modelDirectories)
    );
    const models = this.createModelsFromFiles(modelFiles);
    const levelDB = this.createDB({
      databaseEngine,
      databaseDirectory,
      databaseName
    });
    this.attachDatabaseToModels(models, levelDB);
    return { levelDB, models };
  }
  static createDB({ databaseEngine, databaseDirectory, databaseName }) {
    const backend = backend_1.StorageBackend.createBackend(
      databaseEngine,
      databaseDirectory
    );
    let levelDB;
    switch (databaseEngine) {
      case "memory":
        levelDB = sublevel(levelup(backend), databaseName, {
          valueEncoding: "json"
        });
        break;
      case "leveldb":
        levelDB = sublevel(backend, databaseName, {
          valueEncoding: "json"
        });
        break;
    }
    return levelDB;
  }
  static addModelDirectories(directories) {
    if (!directories) return;
    if (!Array.isArray(directories))
      throw new Error("Model directories is not an array");
    __classPrivateFieldSet(
      this,
      _a,
      Array.from(
        new Set(
          __classPrivateFieldGet(
            this,
            _a,
            "f",
            _Storage_modelDirectories
          ).concat(directories)
        )
      ),
      "f",
      _Storage_modelDirectories
    );
  }
  static get modelDirectories() {
    return __classPrivateFieldGet(this, _a, "f", _Storage_modelDirectories);
  }
  static getModelFiles(directories) {
    if (!directories || !Array.isArray(directories))
      throw new Error("no model directories provided");
    return directories.reduce((files, directory) => {
      if (!fs.existsSync(directory))
        throw new Error("directory does not exist");
      return files.concat(
        fs
          .readdirSync(directory)
          .filter(file => {
            return file.indexOf(this.modelBaseName) !== -1;
          })
          .map(file => {
            return `${directory}/${file}`;
          })
      );
    }, []);
  }
  static createModelsFromFiles(files) {
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
  static attachDatabaseToModels(models, levelDB) {
    Object.values(models).forEach(model => {
      model.setModels(models);
      model.setLevelDB(levelDB);
    });
  }
  static get DEFAULTS() {
    return {
      databaseEngine: "memory",
      databaseDirectory: "./db",
      databaseName: "truffledb",
      modelDirectories: []
    };
  }
}
exports.Storage = Storage;
_a = Storage;
_Storage_modelDirectories = { value: [`${__dirname}/models`] };
Storage.modelBaseName = ".model.js";
Storage.availableBackends = backend_1.StorageBackend.availableBackends();
