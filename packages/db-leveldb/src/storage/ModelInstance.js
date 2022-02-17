const { soliditySha3 } = require("web3-utils");
const jsonDiff = require("json-diff");

module.exports = class ModelInstance {
  #modelProperties = [];
  #validationFunctions = {};
  #requiredFields = {};
  #key;
  #maxHistoricalVersions = 999999999;
  #db;
  #historicalDB;
  #didInit = false;

  constructor(levelDB, historicalLevelDB) {
    this.#key = "id";
    this.#db = levelDB;
    this.#historicalDB = historicalLevelDB;
  }

  init() {
    if (this.#didInit)
      throw new Error("init has already been called for Model");

    this.defineModel();

    this.#didInit = true;
  }

  defineModel() {
    Object.keys(this).forEach(property => {
      this.#modelProperties.push(property);

      const modelProperty = this[property];
      this[property] = undefined;

      if (typeof modelProperty === "object") {
        const { defaultValue, required, validation } = modelProperty;

        if (defaultValue) {
          this[property] = defaultValue;
        }

        if (typeof validation === "function") {
          this.#validationFunctions[property] = validation;
        }

        if (required) this.#requiredFields[property] = true;
      }
    });
  }

  hydrate(data) {
    if (data) this[this.#key] = data[this.#key];

    this.#modelProperties.forEach(property => {
      if (data && data[property]) this[property] = data[property];
    });
  }

  getKeyProperty() {
    return this.#key;
  }

  async save() {
    await this.beforeSave();
    const key = this[this.#key];

    if (key === undefined || key === null) {
      throw new Error(`key property '${this.#key}' is not defined.`);
    }

    this.runValidationFunctions();
    this.checkRequiredFields();

    await this.saveHistory();

    await this.#db.put(key, this);

    await this.afterSave();
  }

  async saveHistory() {
    const lastVersion = await this.history(1, true);

    if (lastVersion.length > 0) {
      const lastHash = this.sha3(lastVersion[0]);
      const thisHash = this.sha3(this);
      if (lastHash === thisHash) return;
    }

    const historicalVersionCount = await this.historyCount();
    const historicalKey = `${this[this.#key]}${historicalVersionCount}`;

    this.#historicalDB.put(historicalKey, this);
  }

  async historyCount() {
    const historicalVersions = await this.history();
    return historicalVersions.length;
  }

  async historyDiff(limit = -1) {
    if (limit > 0) limit++;

    const history = await this.history(limit, true);

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
  }

  async history(limit = -1, reverse = false) {
    let historicalData = [];

    const smallestHistoricalKey = `${this[this.#key]}`;
    const maxHistoricalKey = `${this[this.#key]}${this.#maxHistoricalVersions}`;

    const options = {
      gte: smallestHistoricalKey,
      lte: maxHistoricalKey,
      limit,
      reverse
    };

    return new Promise((resolve, reject) => {
      return this.#historicalDB
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
  }

  runValidationFunctions() {
    for (const property in this.#validationFunctions) {
      const fn = this.#validationFunctions[property];

      if (!fn(this[property]))
        throw new Error(`Validation of ${property} failed.`);
    }
  }

  checkRequiredFields() {
    for (const property in this.#requiredFields) {
      if (this[property] === undefined || this[property] === null) {
        throw new Error(`Missing required field: ${property}`);
      }
    }
  }

  sha3(data) {
    return soliditySha3(JSON.stringify(data));
  }

  async beforeSave() {}
  async afterSave() {}
};
