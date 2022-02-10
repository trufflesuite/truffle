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
var _Model_modelProperties,
  _Model_validationFunctions,
  _Model_requiredFields,
  _Model_key,
  _Model_maxHistoricalVersions,
  _Model_db,
  _Model_historicalDB,
  _Model_didInit,
  _a;
const sublevel = require("subleveldown");
const jsonquery = require("jsonquery");
module.exports =
  ((_a = class Model {
    constructor(levelDB, historicalLevelDB) {
      _Model_modelProperties.set(this, []);
      _Model_validationFunctions.set(this, {});
      _Model_requiredFields.set(this, {});
      _Model_key.set(this, void 0);
      _Model_maxHistoricalVersions.set(this, 999999999);
      _Model_db.set(this, void 0);
      _Model_historicalDB.set(this, void 0);
      _Model_didInit.set(this, false);
      __classPrivateFieldSet(this, _Model_key, "id", "f");
      __classPrivateFieldSet(this, _Model_db, levelDB, "f");
      __classPrivateFieldSet(this, _Model_historicalDB, historicalLevelDB, "f");
    }
    init() {
      if (__classPrivateFieldGet(this, _Model_didInit, "f"))
        throw new Error("init has already been called for Model");
      this.processModelDefinition();
      __classPrivateFieldSet(this, _Model_didInit, true, "f");
    }
    processModelDefinition() {
      Object.keys(this).forEach(property => {
        __classPrivateFieldGet(this, _Model_modelProperties, "f").push(
          property
        );
        const modelProperty = this[property];
        this[property] = undefined;
        if (typeof modelProperty === "object") {
          const { defaultValue, required, validation } = modelProperty;
          if (defaultValue) {
            this[property] = defaultValue;
          }
          if (typeof validation === "function") {
            __classPrivateFieldGet(this, _Model_validationFunctions, "f")[
              property
            ] = validation;
          }
          if (required)
            __classPrivateFieldGet(this, _Model_requiredFields, "f")[
              property
            ] = true;
        }
      });
    }
    getKeyProperty() {
      return __classPrivateFieldGet(this, _Model_key, "f");
    }
    setModelProperties(data) {
      // set keyfield to value from data - temp until key generation is added to model
      if (data)
        this[__classPrivateFieldGet(this, _Model_key, "f")] =
          data[__classPrivateFieldGet(this, _Model_key, "f")];
      __classPrivateFieldGet(this, _Model_modelProperties, "f").forEach(
        property => {
          if (data && data[property]) this[property] = data[property];
        }
      );
    }
    save() {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.beforeSave();
        const key = this[__classPrivateFieldGet(this, _Model_key, "f")];
        if (key === undefined || key === null) {
          throw new Error(
            `key property '${__classPrivateFieldGet(
              this,
              _Model_key,
              "f"
            )}' is not defined.`
          );
        }
        this.runValidationFunctions();
        this.checkRequiredFields();
        yield this.saveHistoricalVersion();
        yield __classPrivateFieldGet(this, _Model_db, "f").put(key, this);
        yield this.afterSave();
      });
    }
    saveHistoricalVersion() {
      return __awaiter(this, void 0, void 0, function* () {
        const historicalVersionCount = yield this.countHistoricalVersions();
        const historicalKey = `${
          this[__classPrivateFieldGet(this, _Model_key, "f")]
        }${historicalVersionCount}`;
        __classPrivateFieldGet(this, _Model_historicalDB, "f").put(
          historicalKey,
          this
        );
      });
    }
    countHistoricalVersions() {
      return __awaiter(this, void 0, void 0, function* () {
        const historicalVersions = yield this.getHistoricalVersions();
        return historicalVersions.length;
      });
    }
    getHistoricalVersions(limit = -1, reverse = false) {
      return __awaiter(this, void 0, void 0, function* () {
        let historicalData = [];
        const smallestHistoricalKey = `${
          this[__classPrivateFieldGet(this, _Model_key, "f")]
        }`;
        const maxHistoricalKey = `${
          this[__classPrivateFieldGet(this, _Model_key, "f")]
        }${__classPrivateFieldGet(this, _Model_maxHistoricalVersions, "f")}`;
        const options = {
          gte: smallestHistoricalKey,
          lte: maxHistoricalKey,
          limit,
          reverse
        };
        return new Promise((resolve, reject) => {
          return __classPrivateFieldGet(this, _Model_historicalDB, "f")
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
    runValidationFunctions() {
      for (const property in __classPrivateFieldGet(
        this,
        _Model_validationFunctions,
        "f"
      )) {
        const fn = __classPrivateFieldGet(
          this,
          _Model_validationFunctions,
          "f"
        )[property];
        if (!fn(this[property]))
          throw new Error(`Validation of ${property} failed.`);
      }
    }
    checkRequiredFields() {
      for (const property in __classPrivateFieldGet(
        this,
        _Model_requiredFields,
        "f"
      )) {
        if (this[property] === undefined || this[property] === null) {
          throw new Error(`Missing required field: ${property}`);
        }
      }
    }
    beforeSave() {
      return __awaiter(this, void 0, void 0, function* () {});
    }
    afterSave() {
      return __awaiter(this, void 0, void 0, function* () {});
    }
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
      modelInstance.setModelProperties(data);
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
    static countHistoricalVersions() {
      return __awaiter(this, void 0, void 0, function* () {
        const historicalVersions = yield this.getHistoricalVersions();
        return historicalVersions.length;
      });
    }
    static getHistoricalVersions(key, limit = -1, reverse = false) {
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
  (_Model_modelProperties = new WeakMap()),
  (_Model_validationFunctions = new WeakMap()),
  (_Model_requiredFields = new WeakMap()),
  (_Model_key = new WeakMap()),
  (_Model_maxHistoricalVersions = new WeakMap()),
  (_Model_db = new WeakMap()),
  (_Model_historicalDB = new WeakMap()),
  (_Model_didInit = new WeakMap()),
  (_a.maxHistoricalVersions = 999999999),
  _a);
