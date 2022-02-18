export declare class StorageBackend {
  static availableBackends(): string[];
  static createBackend(database?: string, directory?: string): any;
}
