import { Solver } from "@truffle/solver";
import { DeclarationTarget } from "./types/";
import { deployer } from "@truffle/deployer";
import { Resolver } from "@truffle/resolver";
import Config from "@truffle/config";
import TruffleError from "@truffle/error";

export const Runner = {
  orchestrate: async function (declarationSteps, options) {
    // run each target through the run function, hold output until all are completed,
    // or throw an error
    // TODO: add error handling
    const deploymentSteps = declarationSteps.map(async step => {
      const result = await this.run(step, options);
      return result;
    });
    return deploymentSteps;
  },
  solve: async function (filepath: string, options: any) {
    const declarationSteps = await Solver.Solver.orchestrate(filepath);
    this.orchestrate(declarationSteps, options);
    return declarationSteps;
  },
  run: async function (deploymentStep: DeclarationTarget, options: any) {
    const config = Config.detect(options);
    // let resolver: resolver;
    config.resolver = new Resolver(config);
    // config.resolver = resolver;

    let Contract;
    try {
      Contract = config.resolver.require(deploymentStep.contractName);
    } catch (e) {
      throw new TruffleError(e);
    }

    // need something here to handle the state

    //add any linked contracts

    if (deploymentStep.run.includes("link")) {
      // await deployer.link(contract, deploymentStep.links);
    }
    if (deploymentStep.run.includes("deploy")) {
      // @TODO: will need to add options here for the deployment like gasPrice, etc.
      deployer.deploy(Contract);
    }
    // if (deploymentStep.run.includes("script")) {
    //   //execute script
    // }
  }
};
