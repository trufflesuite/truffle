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
export interface UserDeclaration {
  [deployed: string]: [
    {
      [network: string]: [
        {
          contract: string;
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
  script?: ScriptObject;
  contractName?: string;
  network: string;
  // other contracts, any captured variables from a previous deployment
  // not sure what the best way to arrange these will be, just an array of any for now
  dependencies?: string[];
  //this will be a function to check whether the target in question
  //has finished successfully
  isCompleted: boolean;
  links?: string[];
  //this is the function to complete this target, this is the function that will
  //actually deploy, link, execute, etc.; ultimately the execution layer of the declarative
  //deployments module will look something like DeploymentSteps[0].run(contractName, options), etc.;
  run: Array<"deploy" | "link" | "execute">;
}
export type DeclarationObject = {
  contract: string;
  links?: string[];
};

export interface DeclarationEntry {
  [network: string]: [DeclarationObject];
}

export interface DeclarationEnvironment {
  [environment: string]: [DeclarationEntry];
}

export type DeploymentSteps = DeclarationTarget[];
