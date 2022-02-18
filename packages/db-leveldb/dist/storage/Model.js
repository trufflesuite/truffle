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
var _a;
const sublevel = require("subleveldown");
const jsonquery = require("jsonquery");
const ModelInstance = require("./ModelInstance");
module.exports =
  ((_a = class Model extends ModelInstance {
    static setLevelDB(levelDB) {
      this.levelDB = sublevel(levelDB, this.constructor.name, {
        valueEncoding: "json"
      });
      this.historicalLevelDB = sublevel(
        levelDB,
        `${this.constructor.name}-historical`,
        {
          valueEncoding: "json"
        }
      );
    }
    static setModels(models) {
      this.models = models;
    }
    static all(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        return new Promise((resolve, reject) => {
          return this.levelDB
            .createValueStream(options)
            .on("data", data => {
              results.push(this.build(data));
            })
            .on("error", err => {
              reject(err);
            })
            .on("end", () => {
              resolve(results);
            });
        });
      });
    }
    static build(data) {
      const modelInstance = new this(this.levelDB, this.historicalLevelDB);
      modelInstance.init();
      modelInstance.hydrate(data);
      return modelInstance;
    }
    static create(data) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.levelDB)
          throw new Error(
            "Model is not connected to levelDB instance. Use setLevelDB to connect model to db."
          );
        const modelInstance = this.build(data);
        yield modelInstance.save();
        return modelInstance;
      });
    }
    static delete(key) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.levelDB.del(key);
      });
    }
    static find(query = {}, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const results = [];
        return new Promise((resolve, reject) => {
          return this.levelDB
            .createValueStream(options)
            .pipe(jsonquery(query))
            .on("data", data => {
              results.push(this.build(data));
            })
            .on("error", err => {
              reject(err);
            })
            .on("end", () => {
              resolve(results);
            });
        });
      });
    }
    static exists(key) {
      return __awaiter(this, void 0, void 0, function* () {
        return !!(yield this.get(key));
      });
    }
    static get(key) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          return this.build(yield this.levelDB.get(key));
        } catch (e) {
          return undefined;
        }
      });
    }
    static getMany(keys) {
      return __awaiter(this, void 0, void 0, function* () {
        const records = yield this.levelDB.getMany(keys);
        return records.map(record => {
          return this.build(record);
        });
      });
    }
    static historyCount() {
      return __awaiter(this, void 0, void 0, function* () {
        const historicalVersions = yield this.history();
        return historicalVersions.length;
      });
    }
    static history(key, limit = -1, reverse = false) {
      return __awaiter(this, void 0, void 0, function* () {
        let historicalData = [];
        const smallestHistoricalKey = `${key}`;
        const maxHistoricalKey = `${key}${this.maxHistoricalVersions}`;
        const options = {
          gte: smallestHistoricalKey,
          lte: maxHistoricalKey,
          limit,
          reverse
        };
        return new Promise((resolve, reject) => {
          return this.historicalLevelDB
            .createValueStream(options)
            .on("data", data => {
              historicalData.push(data);
            })
            .on("error", err => {
              reject(err);
            })
            .on("end", () => {
              resolve(historicalData);
            });
        });
      });
    }
    static batchBuild(batchData) {
      return batchData.map(data => {
        return this.build(data);
      });
    }
    static batchCreate(batchData) {
      return __awaiter(this, void 0, void 0, function* () {
        let modelInstances;
        try {
          modelInstances = Promise.all(
            batchData.map(data =>
              __awaiter(this, void 0, void 0, function* () {
                return yield this.create(data);
              })
            )
          );
        } catch (e) {
          throw new Error("batchCreate operation failed");
        }
        return modelInstances;
      });
    }
    static batchDelete() {
      return __awaiter(this, void 0, void 0, function* () {});
    }
  }),
  (_a.maxHistoricalVersions = 999999999),
  _a);
