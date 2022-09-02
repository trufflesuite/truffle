import { loadAll } from "js-yaml";
import { readFile } from "fse";
import { DeploymentSteps, DeclarationEntry } from "./types/";
import * as validate from "./schema/validate";

const toposort = require("toposort");

const Solver = {
  read: async function (filepath: string): Promise<any> {
    const declarations: any = loadAll(await readFile(filepath, "utf8"));
    // loadAll returns an array, we just want the first item; we will assume a user only has one declaration per project
    const valid = validate.validate(declarations[0]);

    // @TODO check specifically for yaml in case this is a JSON file!
    // const fileExtension = filepath.split('.').pop();
    // if (fileExtension === 'yaml') {
    //   declarations = loadAll(declarations);
    // }
    if (valid) {
      return declarations[0];
    } else {
      //TODO finesse error handling
      throw new Error("Invalid declaration file");
    }
  },
  sort: async function (
    dependencies: Array<string>,
    deploymentSteps: DeploymentSteps
  ) {
    let sortedSteps: Array<any> = [];
    const sortedContracts = toposort(dependencies);
    // let's rearrange our deploymentSteps so that dependencies are added first
    sortedContracts.map((step: string) => {
      let item: any = deploymentSteps.find(item => item.contractName === step);
      if (item !== null && item !== undefined) {
        sortedSteps.push(item);
      }
    });
    return sortedSteps;
  },
  // put together a list of contracts that need to be deployed, with relevant information for the deployment
  orchestrate: async function (filepath: string): Promise<DeploymentSteps> {
    let declarations: Array<any> = await this.read(filepath);
    let deploymentSteps: DeploymentSteps = [];
    let dependencies: Array<any> = [];

    declarations.map(declaration => {
      declaration.deployed.map((entry: DeclarationEntry) => {
        // should I split up the actions here? a declaration with a linked contract will need the link
        // part and then the deploy
        const entryValues: Array<any> = Object.values(entry)[0];
        entryValues.map(contract => {
          let runActions: Array<string> = ["deploy"];
          // will have capture variables to add to dependencies also, this is just the start
          //pairs of dependencies for topological sort
          let links = [];
          if (contract.links) {
            runActions.push("link");
            links = contract.links;
            links.map(link => {
              dependencies.push([link, contract.contract]);
            });
          } else {
            dependencies.push([contract.contract]);
          }

          let declarationTarget = {
            contractName: contract.contract,
            network: Object.keys(entry)[0],
            dependencies: links,
            links: links,
            isCompleted: false,
            run: runActions
          };
          deploymentSteps.push(declarationTarget);
        });
      });
    });

    // ok now get our deploymentSteps in the correct order accounting for dependencies
    const sortedSteps = await this.sort(dependencies, deploymentSteps);
    return sortedSteps;
  }
};

export default Solver;
