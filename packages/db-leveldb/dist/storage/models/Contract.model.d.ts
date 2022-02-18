export = Contract;
declare class Contract extends Model {
  contractName: {
    defaultValue: string;
  };
  abi: {
    defaultValue: never[];
  };
  metadata: {
    defaultValue: string;
  };
  devdoc: {
    defaultValue: string;
  };
  userdoc: {
    defaultValue: string;
  };
  sourcePath: {
    defaultValue: string;
  };
  source: {
    defaultValue: string;
  };
  sourceMap: {
    defaultValue: string;
  };
  ast: {
    defaultValue: {};
  };
  legacyAST: {
    defaultValue: {};
  };
  bytecode: {
    defaultValue: string;
  };
  deployedBytecode: {
    defaultValue: string;
  };
  compiler: {
    defaultValue: {};
  };
  processedSource: any;
  createBytecode: any;
  callBytecode: any;
  callBytecodeGeneratedSources: any;
  createBytecodeGeneratedSources: any;
  id: string | null | undefined;
  generateID(): string | null;
  #private;
}
import Model = require("../Model");
