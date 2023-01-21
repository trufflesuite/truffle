import { loadAll } from "js-yaml";
import { readFile } from "fse";
import {
  DeploymentSteps,
  DeclarationEntry,
  UserDeclaration,
  DeclarationTarget,
  DeclarationObject,
  UserDeclarationWithEnvironment
} from "./types/";
// import * as validate from "./schema/validate";
import toposort from "toposort";

const Solver = {
  async read(
    filepath: string
  ): Promise<UserDeclaration | UserDeclarationWithEnvironment | Error> {
    const declarations: UserDeclaration[] | UserDeclarationWithEnvironment[] =
      loadAll(await readFile(filepath, "utf8"));
    // loadAll returns an array, we just want the first item; we will assume a user only has one declaration per project
    // just commenting out validation temporarily. @TODO: fix validation to cover environments
    // const valid = validate.validate(declarations[0]);

    // @TODO check specifically for yaml in case this is a JSON file!
    // const fileExtension = filepath.split('.').pop();
    // if (fileExtension === 'yaml') {
    //   declarations = loadAll(declarations);
    // }
    //@TODO: remove this once validation is fixed
    let valid = true;
    if (valid) {
      return declarations[0];
    } else {
      // TODO finesse error handling
      throw new Error("Invalid declaration file");
    }
  },
  async sort(
    dependencies: string[][],
    deploymentSteps: DeploymentSteps
  ): Promise<DeclarationTarget[]> {
    let sortedSteps: DeclarationTarget[] = [];
    const sortedContracts = toposort(dependencies);
    // let's rearrange our deploymentSteps so that dependencies are added first
    sortedContracts.map((step: string) => {
      let item: DeclarationTarget | undefined = deploymentSteps.find(
        item => item.contractName === step
      );

      if (item !== undefined) {
        sortedSteps.push(item as DeclarationTarget);
      }
    });
    return sortedSteps;
  },
  // put together a list of contracts that need to be deployed, with relevant information for the deployment
  async orchestrate(
    filepath: string,
    env: string | undefined
  ): Promise<DeploymentSteps> {
    //TODO change this any to a type
    let userDeclarations: UserDeclaration[] | UserDeclarationWithEnvironment[];
    userDeclarations = await this.read(filepath);

    let declarations;
    // check whether the user has specified an environment; if so only deploy that
    // part of the declaration
    // @TODO: handle case of declarations file with listed environments but no environment specified in command (currently throws an unhelpful error)
    if (env && userDeclarations["deployed"][0][env]) {
      //only deploy the part of the declaration file matching the env
      declarations = {
        deployed: userDeclarations["deployed"][0][env]
      };
    } else if (env) {
      //if there is no declaration for the specified environment, throw an error
      throw new Error("No declaration for the specified environment");
    } else {
      declarations = userDeclarations;
    }

    let deploymentSteps: DeploymentSteps = [];
    let dependencies: string[][] = [];

    declarations["deployed"].map((entry: DeclarationEntry) => {
      // should I split up the actions here? a declaration with a linked contract will need the link
      // part and then the deploy
      const entryValues: Array<DeclarationObject> = Object.values(entry)[0];
      entryValues.map(contract => {
        let runActions: Array<"deploy" | "link" | "execute"> = ["deploy"];
        // will have capture variables to add to dependencies also, this is just the start
        //pairs of dependencies for topological sort
        let links: string[] = [];
        if (contract.links) {
          runActions.push("link");
          links = contract.links;
          links.map(link => {
            dependencies.push([link, contract.contract]);
          });
        } else {
          dependencies.push([contract.contract]);
        }

        let declarationTarget: DeclarationTarget = {
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

    // ok now get our deploymentSteps in the correct order accounting for dependencies
    const sortedSteps = await this.sort(dependencies, deploymentSteps);
    return sortedSteps;
  }
};

export default Solver;
