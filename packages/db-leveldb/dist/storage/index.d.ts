declare const levelup: any;
declare type CreateStorageOptions = {
  databaseEngine?: string;
  databaseDirectory?: string;
  databaseName?: string;
  modelDirectories?: string[];
};
export declare class Storage {
  #private;
  static modelBaseName: string;
  static availableBackends: string[];
  static createStorage({
    databaseEngine,
    databaseDirectory,
    databaseName,
    modelDirectories
  }: CreateStorageOptions): {
    levelDB: any;
    models: any;
  };
  static createDB({
    databaseEngine,
    databaseDirectory,
    databaseName
  }: CreateStorageOptions): any;
  static addModelDirectories(directories: string[] | undefined): void;
  static get modelDirectories(): string[];
  static getModelFiles(directories: string[]): string[];
  static createModelsFromFiles(files: string[]): any;
  static attachDatabaseToModels(models: object, levelDB: typeof levelup): void;
  static get DEFAULTS(): CreateStorageOptions;
}
export {};
