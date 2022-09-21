//tslint-disable
// solver typescript definitions

export interface DeclarationTarget {
  contractName: string;
  network: string;
  // other contracts, any captured variables from a previous deployment
  // not sure what the best way to arrange these will be, just an array of any for now
  dependencies: Array<any>;
  //this will be a function to check whether the target in question
  //has finished successfully
  isCompleted: any;
  links: Array<string>;
  //this is the function to complete this target, this is the function that will
  //actually deploy, link, execute, etc.; ultimately the execution layer of the declarative
  //deployments module will look something like DeploymentSteps[0].run(contractName, options), etc.;
  run: Array<string>;
}

export interface DeclarationEntry {
  [network: string]: [
    {
      contract: string;
      links?: Array<string>;
    }
  ];
}

export type DeploymentSteps = Array<DeclarationTarget>;
