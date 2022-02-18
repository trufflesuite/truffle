export declare type TruffleDBConfig = {
  projectName?: string;
  databaseName?: string;
  databaseEngine?: string;
  databaseDirectory?: string;
  modelDirectories?: string[];
};
export declare type ModelLookup = {
  [model: string]: {
    exists: Function;
    get: Function;
    create: Function;
    all: Function;
  };
};
export declare class TruffleDB {
  config: TruffleDBConfig;
  levelDB: {
    close: Function;
    clear: Function;
  };
  models: ModelLookup;
  constructor(config?: TruffleDBConfig);
  close(): Promise<void>;
  getProject(name?: string | undefined): Promise<any>;
  getTruffleConfig(): {};
  static get DEFAULTS(): TruffleDBConfig;
}
