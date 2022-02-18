export = Compilation;
declare class Compilation extends Model {
  compiler: {
    defaultValue: {};
  };
  sources: {
    defaultValue: never[];
  };
  sourceIndexes: {
    defaultValue: never[];
  };
  processedSources: any;
  sourceMaps: any;
  contracts: {
    defaultValue: never[];
  };
  immutableReferences: any;
  id: string | null | undefined;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
