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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruffleDB = void 0;
const storage_1 = require("./storage");
const config_1 = __importDefault(require("@truffle/config"));
const path = require("path");
class TruffleDB {
  constructor(config) {
    const truffleConfig = this.getTruffleConfig();
    this.config = Object.assign(
      Object.assign(Object.assign({}, TruffleDB.DEFAULTS), truffleConfig),
      config
    );
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
  getProject(name = this.config.projectName) {
    return __awaiter(this, void 0, void 0, function* () {
      const { Project } = this.models;
      try {
        if (yield Project.exists(name)) {
          return yield Project.get(name);
        } else {
          return yield Project.create({ name });
        }
      } catch (e) {
        console.log(e);
      }
    });
  }
  getTruffleConfig() {
    let truffleConfig = {};
    let projectConfig = {};
    let userConfig = {};
    try {
      projectConfig = config_1.default.detect().db; // This throws
      const UserConfig = config_1.default.getUserConfig();
      userConfig = UserConfig.get("db");
      truffleConfig = Object.assign(
        Object.assign({}, userConfig),
        projectConfig
      );
    } catch (e) {
      // debug log this but package has default values.
    }
    return truffleConfig;
  }
  static get DEFAULTS() {
    return {
      projectName: path.basename(path.resolve()),
      databaseName: "truffledb",
      databaseEngine: "memory",
      databaseDirectory: "./db",
      modelDirectories: []
    };
  }
}
exports.TruffleDB = TruffleDB;
