var sublevel = require("subleveldown");

module.exports = class Model {
  static levelDB;
  #modelProperties = [];
  #validationFunctions = {};
  #requiredFields = {};
  #key;
  #db;
  #didInit = false;

  constructor(levelDB) {
    this.#key = this.key || "id";
    this.#db = levelDB;
  }

  init() {
    if (this.#didInit)
      throw new Error("init has already been called for Model");

    this.processModelDefinition();
    this.#didInit = true;
  }

  processModelDefinition() {
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

  getKeyProperty() {
    return this.#key;
  }

  setModelProperties(data) {
    // set keyfield to value from data - temp until key generation is added to model
    if (data) this[this.#key] = data[this.#key];

    this.#modelProperties.forEach(property => {
      if (data && data[property]) this[property] = data[property];
    });
  }

  async save() {
    await this.beforeSave();
    const key = this[this.#key];

    if (key === undefined || key === null) {
      throw new Error(`key property '${this.#key}' is not defined.`);
    }

    this.runValidationFunctions();
    this.checkRequiredFields();

    await this.#db.put(key, this);
    await this.afterSave();
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

  async beforeSave() {}
  async afterSave() {}

  static setLevelDB(levelDB) {
    this.levelDB = sublevel(levelDB, this.constructor.name, {
      valueEncoding: "json"
    });
  }

  static async all(options) {
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
  }

  static build(data) {
    const modelInstance = new this(this.levelDB);
    modelInstance.init();
    modelInstance.setModelProperties(data);
    return modelInstance;
  }

  static async create(data) {
    if (!this.levelDB)
      throw new Error(
        "Model is not connected to levelDB instance. Use setLevelDB to connect model to db."
      );

    const modelInstance = this.build(data);
    await modelInstance.save();
    return modelInstance;
  }

  static async delete(key) {
    await this.levelDB.del(key);
  }

  static async get(key) {
    try {
      return this.build(await this.levelDB.get(key));
    } catch (e) {
      return undefined;
    }
  }

  static async getMany(keys) {
    const records = await this.levelDB.getMany(keys);
    return records.map(record => {
      return this.build(record);
    });
  }

  static batchBuild(batchData) {
    return batchData.map(data => {
      return this.build(data);
    });
  }

  static async batchCreate(batchData) {
    let modelInstances;
    try {
      modelInstances = this.batchBuild(batchData);

      const keyProperty = this.build(modelInstances[0]).getKeyProperty();

      const batchOperations = batchData.map(data => {
        return { type: "put", key: data[keyProperty], value: data };
      });

      await this.levelDB.batch(batchOperations);
    } catch (e) {
      throw new Error("batchCreate operation failed");
    }

    return modelInstances;
  }

  static async batchDelete() {}
};
