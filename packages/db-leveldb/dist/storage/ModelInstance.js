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
var _ModelInstance_modelProperties,
  _ModelInstance_validationFunctions,
  _ModelInstance_requiredFields,
  _ModelInstance_key,
  _ModelInstance_maxHistoricalVersions,
  _ModelInstance_db,
  _ModelInstance_historicalDB,
  _ModelInstance_didInit,
  _a;
const { soliditySha3 } = require("web3-utils");
const jsonDiff = require("json-diff");
module.exports =
  ((_a = class ModelInstance {
    constructor(levelDB, historicalLevelDB) {
      _ModelInstance_modelProperties.set(this, []);
      _ModelInstance_validationFunctions.set(this, {});
      _ModelInstance_requiredFields.set(this, {});
      _ModelInstance_key.set(this, void 0);
      _ModelInstance_maxHistoricalVersions.set(this, 999999999);
      _ModelInstance_db.set(this, void 0);
      _ModelInstance_historicalDB.set(this, void 0);
      _ModelInstance_didInit.set(this, false);
      __classPrivateFieldSet(this, _ModelInstance_key, "id", "f");
      __classPrivateFieldSet(this, _ModelInstance_db, levelDB, "f");
      __classPrivateFieldSet(
        this,
        _ModelInstance_historicalDB,
        historicalLevelDB,
        "f"
      );
    }
    init() {
      if (__classPrivateFieldGet(this, _ModelInstance_didInit, "f"))
        throw new Error("init has already been called for Model");
      this.defineModel();
      __classPrivateFieldSet(this, _ModelInstance_didInit, true, "f");
    }
    defineModel() {
      Object.keys(this).forEach(property => {
        __classPrivateFieldGet(this, _ModelInstance_modelProperties, "f").push(
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
            __classPrivateFieldGet(
              this,
              _ModelInstance_validationFunctions,
              "f"
            )[property] = validation;
          }
          if (required)
            __classPrivateFieldGet(this, _ModelInstance_requiredFields, "f")[
              property
            ] = true;
        }
      });
    }
    hydrate(data) {
      if (data)
        this[__classPrivateFieldGet(this, _ModelInstance_key, "f")] =
          data[__classPrivateFieldGet(this, _ModelInstance_key, "f")];
      __classPrivateFieldGet(this, _ModelInstance_modelProperties, "f").forEach(
        property => {
          if (data && data[property]) this[property] = data[property];
        }
      );
    }
    getKeyProperty() {
      return __classPrivateFieldGet(this, _ModelInstance_key, "f");
    }
    save() {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.beforeSave();
        const key = this[__classPrivateFieldGet(this, _ModelInstance_key, "f")];
        if (key === undefined || key === null) {
          throw new Error(
            `key property '${__classPrivateFieldGet(
              this,
              _ModelInstance_key,
              "f"
            )}' is not defined.`
          );
        }
        this.runValidationFunctions();
        this.checkRequiredFields();
        yield this.saveHistory();
        yield __classPrivateFieldGet(this, _ModelInstance_db, "f").put(
          key,
          this
        );
        yield this.afterSave();
      });
    }
    saveHistory() {
      return __awaiter(this, void 0, void 0, function* () {
        const lastVersion = yield this.history(1, true);
        if (lastVersion.length > 0) {
          const lastHash = this.sha3(lastVersion[0]);
          const thisHash = this.sha3(this);
          if (lastHash === thisHash) return;
        }
        const historicalVersionCount = yield this.historyCount();
        const historicalKey = `${
          this[__classPrivateFieldGet(this, _ModelInstance_key, "f")]
        }${historicalVersionCount}`;
        __classPrivateFieldGet(this, _ModelInstance_historicalDB, "f").put(
          historicalKey,
          this
        );
      });
    }
    historyCount() {
      return __awaiter(this, void 0, void 0, function* () {
        const historicalVersions = yield this.history();
        return historicalVersions.length;
      });
    }
    historyDiff(limit = -1) {
      return __awaiter(this, void 0, void 0, function* () {
        if (limit > 0) limit++;
        const history = yield this.history(limit, true);
        if (history.length < 2) {
          return [];
        }
        const diff = [];
        for (let i = 1; i < history.length; i++) {
          const prevRecord = history[i];
          const curRecord = history[i - 1];
          diff.push(jsonDiff.diff(prevRecord, curRecord));
        }
        return diff;
      });
    }
    history(limit = -1, reverse = false) {
      return __awaiter(this, void 0, void 0, function* () {
        let historicalData = [];
        const smallestHistoricalKey = `${
          this[__classPrivateFieldGet(this, _ModelInstance_key, "f")]
        }`;
        const maxHistoricalKey = `${
          this[__classPrivateFieldGet(this, _ModelInstance_key, "f")]
        }${__classPrivateFieldGet(
          this,
          _ModelInstance_maxHistoricalVersions,
          "f"
        )}`;
        const options = {
          gte: smallestHistoricalKey,
          lte: maxHistoricalKey,
          limit,
          reverse
        };
        return new Promise((resolve, reject) => {
          return __classPrivateFieldGet(this, _ModelInstance_historicalDB, "f")
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
        _ModelInstance_validationFunctions,
        "f"
      )) {
        const fn = __classPrivateFieldGet(
          this,
          _ModelInstance_validationFunctions,
          "f"
        )[property];
        if (!fn(this[property]))
          throw new Error(`Validation of ${property} failed.`);
      }
    }
    checkRequiredFields() {
      for (const property in __classPrivateFieldGet(
        this,
        _ModelInstance_requiredFields,
        "f"
      )) {
        if (this[property] === undefined || this[property] === null) {
          throw new Error(`Missing required field: ${property}`);
        }
      }
    }
    sha3(data) {
      return soliditySha3(JSON.stringify(data));
    }
    beforeSave() {
      return __awaiter(this, void 0, void 0, function* () {});
    }
    afterSave() {
      return __awaiter(this, void 0, void 0, function* () {});
    }
  }),
  (_ModelInstance_modelProperties = new WeakMap()),
  (_ModelInstance_validationFunctions = new WeakMap()),
  (_ModelInstance_requiredFields = new WeakMap()),
  (_ModelInstance_key = new WeakMap()),
  (_ModelInstance_maxHistoricalVersions = new WeakMap()),
  (_ModelInstance_db = new WeakMap()),
  (_ModelInstance_historicalDB = new WeakMap()),
  (_ModelInstance_didInit = new WeakMap()),
  _a);
