//tslint-disable
// solver typescript definitions

// did not see the config options typed anywhere else, so took a first stab at it
export type configOptions = {
  "_": [];
  "reset": boolean;
  "compile-all": boolean;
  "compileAll": boolean;
  "compile-none": boolean;
  "compileNone": boolean;
  "--verbose-rpc": boolean;
  "verboseRpc": boolean;
  "verbose-rpc": boolean;
  "dry-run": boolean;
  "dryRun": boolean;
  "skip-dry-run": boolean;
  "skipDryRun": boolean;
  "interactive": boolean;
  "describe-json": boolean;
  "describeJson": boolean;
  "save": boolean;
  "r": boolean;
  "e": boolean[];
  "s": boolean;
  "t": boolean;
  "$0": string;
};

type variables = Record<string, any>;
export interface UserDeclaration {
  [deployed: string]: [
    {
      [network: string]: [
        {
          contract: string;
          variables?: variables;
          links?: string[];
        }
      ];
    }
  ];
}

export interface UserDeclarationWithEnvironment {
  [deployed: string]: {
    [environment: string]: {
      [network: string]: [
        {
          contract: string;
          variables?: variables;
          links?: string[];
        }
      ];
    };
  };
}

type ScriptObject = {
  path: string;
  before?: string;
  after?: string[];
  beforeEach?: string[];
  afterEach?: string[];
};
export interface DeclarationTarget {
  script?: string;
  contractName?: string;
  network: string;
  // other contracts, any captured variables from a previous deployment
  isCompleted: boolean;
  links?: string[];
  variables?: variables;
  //this is the function to complete this target, this is the function that will
  //actually deploy, link, execute, etc.;
  run: Array<"deploy" | "link" | "execute">;
}

export type scriptObject = {
  path: string;
  before?: string[];
  after?: string[];
};

export type DeclarationObject = {
  contract?: string;
  variables?: variables;
  links?: string[];
  process?: ScriptObject;
};

export interface DeclarationEntry {
  [network: string]: [DeclarationObject];
}

export interface DeclarationEnvironment {
  [environment: string]: [DeclarationEntry];
}

export type DeploymentSteps = DeclarationTarget[];
