import { Solver } from "@truffle/solver";
import { DeclarationTarget } from "./types/";
import Deployer from "@truffle/deployer";
import { Resolver } from "@truffle/resolver";
import Config from "@truffle/config";

const Runner = {
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
    const declarationSteps = await Solver.orchestrate(filepath);
    this.orchestrate(declarationSteps, options);
    return declarationSteps;
  },
  run: async function (deploymentStep: DeclarationTarget, options: any) {
    options.network = "development";
    const config = Config.detect(options);
    // since the whole point of the runner is to run deployments for more than one network,
    // we need to set the network to the one specified in the declaration, after checking it exists
    // in the config
    // TODO update this to play with environment-based config, when that is ready; this way of
    // handling networks is temporary
    const configNetworks = config.networks;
    if (configNetworks[deploymentStep.network]) {
      config.network = deploymentStep.network;
    } else {
      throw new Error(`Network ${deploymentStep.network} not found in config`);
    }

    // Config.detect doesn't seem to set resolver, so we'll do it manually
    config.resolver = new Resolver(config);

    let Contract;
    try {
      Contract = config.resolver.require(deploymentStep.contractName);
    } catch (e) {
      throw new Error(JSON.stringify(e));
    }

    // need something here to handle the state

    //add any linked contracts

    if (deploymentStep.run.includes("link")) {
      // await deployer.link(contract, deploymentStep.links);
    }
    if (deploymentStep.run.includes("deploy")) {
      // @TODO: will need to add options here for the deployment like gasPrice, etc.
      const deployer = new Deployer(config);
      deployer.deploy(Contract);
    }
    // if (deploymentStep.run.includes("script")) {
    //   //execute script
    // }
  }
};

export default Runner;
