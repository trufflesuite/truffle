export = Model;
declare class Model extends ModelInstance {
  static levelDB: any;
  static historicalLevelDB: any;
  static models: any;
  static maxHistoricalVersions: number;
  static setLevelDB(levelDB: any): void;
  static setModels(models: any): void;
  static all(options: any): Promise<any>;
  static build(data: any): import("./Model");
  static create(data: any): Promise<import("./Model")>;
  static delete(key: any): Promise<void>;
  static find(query: {} | undefined, options: any): Promise<any>;
  static exists(key: any): Promise<boolean>;
  static get(key: any): Promise<import("./Model") | undefined>;
  static getMany(keys: any): Promise<any>;
  static historyCount(): Promise<any>;
  static history(key: any, limit?: number, reverse?: boolean): Promise<any>;
  static batchBuild(batchData: any): any;
  static batchCreate(batchData: any): Promise<any[]>;
  static batchDelete(): Promise<void>;
  #private;
}
import ModelInstance = require("./ModelInstance");
