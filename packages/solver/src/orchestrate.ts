import { loadAll } from "js-yaml";
import { readFile } from "fse";
import * as path from "path";

// @to-do: move to types folder/file

type DeploymentObject = {
  contractName: string;
  network: string;
};
type DeploymentSteps= Array<DeploymentObject>;

const Solver = {
  orchestrate: async function (filepath: string): Promise<DeploymentSteps> {

    const declarations: any = loadAll(await readFile(filepath, "utf8"));
    let deploymentSteps: Array<DeploymentSteps>;

    declarations.map((declaration ) => {
      deploymentSteps.push(declaration.deployed);
    });

    return [
      {
        contractName: "SimpleStorage",
        network: "development"
      }
    ];
  }
};

module.exports = Solver;
