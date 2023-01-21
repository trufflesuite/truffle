import { Solver } from "@truffle/solver";
import { configOptions, DeclarationTarget, DeploymentSteps } from "./types/";
import Deployer from "@truffle/deployer";
import Config from "@truffle/config";
import { ResolverIntercept } from "./ResolverIntercept";
import { Environment } from "@truffle/environment";

const Runner = {
  async prepareForDeployments(config: Config) {
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

    const resolver = new ResolverIntercept(config.resolver);

    // Initial context.
    // const context = { web3, interfaceAdapter, config: options };

    const deployer = new Deployer(config);

    return { resolver, deployer };
  },
  async link(
    deploymentStep: DeclarationTarget,
    config: Config,
    deployer: Deployer,
    resolver: ResolverIntercept
  ) {
    let Contract;

    try {
      Contract = resolver.require(deploymentStep.contractName as string);
    } catch (e) {
      throw new Error(JSON.stringify(e));
    }

    //TODO handle multiple links
    //@ts-ignore
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
  async run(deploymentStep: DeclarationTarget, config: Config) {
    const configNetworks = config.networks;
    if (configNetworks[deploymentStep.network]) {
      config.network = deploymentStep.network;
    } else {
      throw new Error(`Network ${deploymentStep.network} not found in config`);
    }

    await Environment.detect(config);
    const { deployer, resolver } = await this.prepareForDeployments(config);
    // TODO update this to play with environment-based config, when that is ready; this way of handling networks is temporary

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
  },
  async orchestrate(
    declarationSteps: DeploymentSteps,
    config: Config,
    options?: configOptions
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
  async solve(config: Config, options: configOptions) {
    const declarationSteps = await Solver.orchestrate(
      config.declarativeDeployment.filepath
    );
    await this.orchestrate(declarationSteps, config, options);
    return declarationSteps;
  }
};

export default Runner;
