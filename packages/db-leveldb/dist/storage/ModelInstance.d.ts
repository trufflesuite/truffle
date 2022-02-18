export = ModelInstance;
declare class ModelInstance {
  constructor(levelDB: any, historicalLevelDB: any);
  init(): void;
  defineModel(): void;
  hydrate(data: any): void;
  getKeyProperty(): string;
  save(): Promise<void>;
  saveHistory(): Promise<void>;
  historyCount(): Promise<any>;
  historyDiff(limit?: number): Promise<any[]>;
  history(limit?: number, reverse?: boolean): Promise<any>;
  runValidationFunctions(): void;
  checkRequiredFields(): void;
  sha3(data: any): string | null;
  beforeSave(): Promise<void>;
  afterSave(): Promise<void>;
  #private;
}
