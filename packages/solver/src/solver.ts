import { loadAll } from "js-yaml";
import { readFile } from "fse";
import { DeploymentSteps, DeclarationEntry } from "./types/";

export const Solver = {
  read: async function (filepath: string): Promise<any> {
    const declarations: any = loadAll(await readFile(filepath, "utf8"));
    // @TODO check specifically for yaml in case this is a JSON file!
    // const fileExtension = filepath.split('.').pop();
    // if (fileExtension === 'yaml') {
    //   declarations = loadAll(declarations);
    // }
    return declarations;
  },
  // put together a list of contracts that need to be deployed, with relevant information for the deployment
  orchestrate: async function (filepath: string): Promise<DeploymentSteps> {
    let declarations: any = await this.read(filepath);
    let deploymentSteps: DeploymentSteps = [];

    declarations.map(declaration => {
      declaration.deployed.map((entry: DeclarationEntry) => {
        // should I split up the actions here? a declaration with a linked contract will need the link
        // part and then the deploy
        const entryValues: Array<any> = Object.values(entry)[0];
        entryValues.map(contract => {
          // will have capture variables to add to dependencies also, this is just the start
          const links = contract.links ? contract.links : [];
          const declarationTarget = {
            contractName: contract.contract,
            network: Object.keys(entry)[0],
            dependencies: links,
            isCompleted: false,
            run: () => {}
          };
          deploymentSteps.push(declarationTarget);
        });
      });
    });
    return deploymentSteps;
  }
};
