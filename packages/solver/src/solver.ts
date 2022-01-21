import { loadAll } from "js-yaml";
import { readFile } from "fse";
import { DeploymentSteps } from "./types/";

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
