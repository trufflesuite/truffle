"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruffleDB = void 0;
const storage_1 = require("./storage");
class TruffleDB {
  constructor(config) {
    this.config = Object.assign(Object.assign({}, TruffleDB.DEFAULTS), config);
    const {
      databaseName,
      databaseEngine,
      databaseDirectory,
      modelDirectories
    } = this.config;
    const { levelDB, models } = storage_1.Storage.createStorage({
      databaseName,
      databaseDirectory,
      databaseEngine,
      modelDirectories
    });
    this.levelDB = levelDB;
    this.models = models;
  }
  close() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.levelDB.close();
    });
  }
  static get DEFAULTS() {
    return {
      databaseName: "truffledb",
      databaseEngine: "memory",
      databaseDirectory: "./db",
      modelDirectories: []
    };
  }
}
exports.TruffleDB = TruffleDB;
