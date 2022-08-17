import Common from "@truffle/compile-common";
import type Config from "@truffle/config";

export type SourcesWithDependenciesArgs = {
  paths: string[];
  options: Config;
};

export type SourcesArgs = {
  sources: {
    [key: string]: string;
  };
  options: Config;
};

export type Targets = string[];

export type CompilerOutput = {
  contracts: {
    [path: string]: object;
  };
  sources: {
    [path: string]: {
      ast?: object;
      legacyAST?: object;
      id: number;
    };
  };
  errors?: any[];
};

export type PrepareSourcesArgs = {
  sources: Common.Sources.Sources;
};

export type ProcessAllSourcesArgs = {
  sources: Common.Sources.Sources;
  compilerOutput: CompilerOutput;
  originalSourcePaths: Common.Sources.PathMapping;
  language: string;
};

export type PrepareCompilerInputArgs = {
  sources: Common.Sources.Sources;
  targets: Targets;
  language: string;
  settings: object;
  modelCheckerSettings: object;
};

export type InternalOptions = {
  language?: string;
  noTransform?: boolean;
  solc?: any;
};

export type PreparedSources = {
  [path: string]: {
    content: string;
  };
};

export type ProcessContractsArgs = {
  compilerOutput: CompilerOutput;
  sources: Common.Sources.Sources;
  originalSourcePaths: Common.Sources.PathMapping;
  solcVersion: string;
};

export type Contracts = {
  [path: string]: {
    [name: string]: any;
  };
};
