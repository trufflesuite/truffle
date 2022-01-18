import { loadAll } from "js-yaml";
import { readFile } from "fse";

// @to-do: move to types folder/file
type DeploymentTarget = {
  contractName: string;
  network: string;
  // other contracts, any captured variables from a previous deployment
  // not sure what the best way to arrange these will be, just an array of any for now
  dependencies?: Array<any>;
  //this will be a function to check whether the target in question
  //has finished successfully
  isCompleted: any;
  //this is the function to complete this target, this is the function that will
  //actually deploy, link, execute, etc.; ultimately the execution layer of the declarative
  //deployments module will look something like DeploymentSteps[0].run(contractName, options), etc.;
  run: any;
};
type DeploymentSteps = Array<DeploymentTarget>;

export const Solver = {
  readFile: async function (filepath: string): Promise<any> {
    const declarations: any = loadAll(await readFile(filepath, "utf8"));
    return declarations;
  },
  orchestrate: async function (filepath: string): Promise<DeploymentSteps> {
    const declarations: any = loadAll(await readFile(filepath, "utf8"));
    let deploymentSteps: Array<DeploymentSteps> = [];
    console.log("declarations loaded! " + JSON.stringify(declarations));
    declarations.map(declaration => {
      console.log(
        "declaration singular " + JSON.stringify(declaration.deployed)
      );
      deploymentSteps.push(declaration.deployed);
    });
    console.log("deployment steps!" + JSON.stringify(deploymentSteps));
    return [
      {
        contractName: "SimpleStorage",
        network: "development",
        dependencies: [
          { contract: "SafeMathLib", SafeMathLibAddress: "0x12345" }
        ],
        run: () => {},
        isCompleted: false
      }
    ];
  }
};
console.log("solver? " + JSON.stringify(Solver));
