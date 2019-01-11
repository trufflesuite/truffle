export interface IProject {
  resolveType (name: string): DataModel.IContractType;
  resolveInstance (name: string, networkId: string): DataModel.IContractInstance;
}

export interface IBytecode {
  instructions: (bytecode: string, sourceMap?: string) => DataModel.IInstruction[];
}

export interface IContext {
  project: IProject;
  Bytecode: IBytecode;
}

