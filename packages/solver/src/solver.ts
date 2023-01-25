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
    //@TODO: remove this once validation is fixed to include environments & scripts
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
        item =>
          item.contractName === (step ?? "") || item.script === (step ?? "")
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
      entryValues.map(instruction => {
        let runActions: Array<"deploy" | "link" | "execute"> = ["deploy"];
        // will have capture variables to add to dependencies also, this is just the start
        //pairs of dependencies for topological sort
        let links: string[] = [];
        if (instruction.contract && instruction.links) {
          runActions.push("link");
          links = instruction.links;
          links.map(link => {
            dependencies.push([link, instruction.contract as string]);
          });
        } else if (instruction.contract) {
          dependencies.push([instruction.contract as string]);
        }

        //handle adding scripts to deployment
        // TODO: error handling -- can't find script, etc.
        let script;
        if (instruction.process) {
          runActions.push("execute");
          script = instruction.process;
          if (script.before) {
            script.before.map((before: string) => {
              dependencies.push([script.path, before]);
            });
          } else if (script.after) {
            script.after.map((after: string) => {
              dependencies.push([after, script.path]);
            });
          } else {
            throw new Error(
              "You must specify contracts that should be deployed before or after a script. For example, to deploy a script before a SimpleStorage.sol, you would add the following to your declaration file: \n\nscripts: \n  - path: ./scripts/deployScript.js \n    before: [SimpleStorage.sol]"
            );
          }
        }

        let declarationTarget: DeclarationTarget = {
          contractName: instruction.contract ? instruction.contract : undefined,
          script: script ? script.path : undefined,
          network: Object.keys(entry)[0],
          links: links,
          isCompleted: false,
          run: runActions
        };

        deploymentSteps.push(declarationTarget);
      });
    });

    // ok now get our deploymentSteps in the correct order accounting for dependencies
    const sortedSteps = await this.sort(dependencies, deploymentSteps);
    console.log("sorted steps " + JSON.stringify(sortedSteps, null, 2));
    return sortedSteps;
  }
};

export default Solver;
