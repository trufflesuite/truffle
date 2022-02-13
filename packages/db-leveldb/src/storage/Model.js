const sublevel = require("subleveldown");
const jsonquery = require("jsonquery");
const ModelInstance = require("./ModelInstance");

module.exports = class Model extends ModelInstance {
  static levelDB;
  static historicalLevelDB;
  static models;
  static maxHistoricalVersions = 999999999;

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
    const modelInstance = new this(this.levelDB, this.historicalLevelDB);
    modelInstance.init();
    modelInstance.hydrate(data);
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

  static async find(query = {}, options) {
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
  }

  static async exists(key) {
    return !!(await this.get(key));
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

  static async countHistoricalVersions() {
    const historicalVersions = await this.getHistoricalVersions();
    return historicalVersions.length;
  }

  static async getHistoricalVersions(key, limit = -1, reverse = false) {
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
  }

  static batchBuild(batchData) {
    return batchData.map(data => {
      return this.build(data);
    });
  }

  static async batchCreate(batchData) {
    let modelInstances;
    try {
      modelInstances = Promise.all(
        batchData.map(async data => {
          return await this.create(data);
        })
      );
    } catch (e) {
      throw new Error("batchCreate operation failed");
    }

    return modelInstances;
  }

  static async batchDelete() {}
};
