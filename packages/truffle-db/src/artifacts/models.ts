import { IBytecode, IProject, IContext } from "truffle-db/data/interface";

import Adapter from "./adapter";

export interface ITruffleResolver {
  require(name: string): any
}

export class Project implements IProject {
  artifacts: ITruffleResolver;
  adapter: Adapter;

  constructor (artifacts: ITruffleResolver) {
    this.artifacts = artifacts;
    this.adapter = new Adapter();
  }

  resolveType (name: string) {
    return this.adapter.read(this.artifacts.require(name));
  }

  resolveInstance(name: string, networkId: string) {
    const abstraction = this.artifacts.require(name);

    const instances = this.adapter.readInstances(abstraction);

    const instance = instances[networkId];

    return instance;
  }
}

export class Bytecode implements IBytecode {
  instructions(bytecode: string, sourceMap?: string): DataModel.IInstruction[] {
    const adapter = new Adapter();

    return adapter.readInstructions(bytecode, sourceMap);
  }
}

export class Context implements IContext {
  project: IProject;
  Bytecode: IBytecode;

  constructor (artifacts: ITruffleResolver) {
    this.project = new Project(artifacts);
    this.Bytecode = new Bytecode();
  }
}
