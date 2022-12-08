import { Solver } from "@truffle/solver";
import { DeclarationTarget } from "./types/";
import Deployer from "@truffle/deployer";
import Config from "@truffle/config";
import { ResolverIntercept } from "./ResolverIntercept";

const Runner = {
  orchestrate: async function (
    declarationSteps: any,
    config: any,
    options: any
  ) {
    // run each target through the run function, hold output until all are completed,
    // or throw an error
    // Using a for loop here because we want fine-grained
    // control over the loop & the ability to break out of it
    // & handle intermediate steps
    //@TODO: handle state for intermediate steps in case deployment fails partway
    let deploymentSteps: DeclarationTarget[] = [];
    for (const step of declarationSteps) {
      try {
        const deploymentStep = await this.run(step, config, options);
        deploymentSteps.push(deploymentStep);
      } catch (error) {
        //handle rejected promises
        throw new Error(JSON.stringify(error));
      }
    }

    return deploymentSteps;
  },
  solve: async function (config: any, options: any) {
    const declarationSteps = await Solver.orchestrate(
      config.declarativeDeployment.filepath
    );
    await this.orchestrate(declarationSteps, config, options);
    return declarationSteps;
  },
  prepareForMigrations: function (options: Config) {
    //this function comes from the current migration flow; may or may not be needed
    // ultimately; for now have commented out the irrelevant parts

    // const interfaceAdapter = createInterfaceAdapter({
    //   provider: options.provider,
    //   networkType: options.networks[options.network].type
    // });
    // const web3 = new Web3Shim({
    //   provider: options.provider,
    //   networkType: options.networks[options.network].type
    // });

    const resolver = new ResolverIntercept(options.resolver);

    // Initial context.
    // const context = { web3, interfaceAdapter, config: options };

    const deployer = new Deployer(options);

    return { resolver, deployer };
  },
  link: async function (
    deploymentStep: DeclarationTarget,
    config: Config,
    deployer: Deployer,
    resolver: ResolverIntercept
  ) {
    const configNetworks = config.networks;
    if (configNetworks[deploymentStep.network]) {
      config.network = deploymentStep.network;
    } else {
      throw new Error(`Network ${deploymentStep.network} not found in config`);
    }

    let Contract;

    try {
      Contract = resolver.require(deploymentStep.contractName);
    } catch (e) {
      throw new Error(JSON.stringify(e));
    }

    //TODO handle multiple links
    const link = resolver.require(deploymentStep.links[0]);
    let linkFunc = async function (link, Contract) {
      const linkInstance = await deployer.link(link, Contract);
      return linkInstance;
    };

    const linkedContract = await linkFunc(link, Contract);

    let artifacts = resolver
      .contracts()
      .map((abstraction: any) => abstraction._json);
    await config.artifactor.saveAll(artifacts);
    return linkedContract;
  },
  // @TODO: will need to add options here for the deployment like gasPrice, etc.
  run: async function (deploymentStep: DeclarationTarget, config: Config) {
    const { deployer, resolver } = this.prepareForMigrations(config);
    // TODO update this to play with environment-based config, when that is ready; this way of handling networks is temporary
    const configNetworks = config.networks;
    if (configNetworks[deploymentStep.network]) {
      config.network = deploymentStep.network;
    } else {
      throw new Error(`Network ${deploymentStep.network} not found in config`);
    }

    // @TODO: add Contract type!
    let Contract;

    try {
      Contract = resolver.require(deploymentStep.contractName);
    } catch (e) {
      throw new Error(JSON.stringify(e));
    }

    await deployer.start();

    if (deploymentStep.run.includes("link")) {
      await this.link(deploymentStep, config, deployer, resolver);
    }

    if (deploymentStep.run.includes("deploy")) {
      const deploy = async function () {
        await deployer.deploy(Contract);

        let artifacts = resolver
          .contracts()
          .map((abstraction: any) => abstraction._json);
        await config.artifactor.saveAll(artifacts);
        return await Contract.isDeployed();
      };

      try {
        await deploy();
      } catch (e) {
        throw e;
      }

      await deployer.finish();

      if (await Contract.isDeployed()) {
        deploymentStep.isCompleted = true;
      }

      // @TODO: add Contract/artifact info to deploymentStep?
      // Or save somewhere
      return deploymentStep;
    }
    // @TODO: add script handling
    // if (deploymentStep.run.includes("script")) {
    //   //   //execute script
    //   // }
  }
};

export default Runner;
