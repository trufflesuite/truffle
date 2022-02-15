import { Solver } from "@truffle/solver";

const yamlPath = "src/test/mockDeclarations/sampleYaml.yaml";
const jsonPath = "src/test/mockDeclarations/sampleJson.json";

// still working out the run function: maybe this should just pass variables to a run function in the runner
const expectedDeclarationTargets = [
  {
    contractName: "SafeMathLib",
    network: "ethereum",
    // action: "deploy",
    dependencies: [],
    isCompleted: false,
    run: (network, contractName, deployer, artifacts) => {
      artifacts.require(contractName);
      deployer.deploy(contractName);
    }
  },
  {
    contractName: "SumDAO",
    network: "ethereum",
    action: "link",
    dependencies: ["SafeMathLib"],
    isCompleted: false,
    run: (network, link, contractName, deployer, artifacts) => {
      artifacts.require(link);
      artifacts.require(contractName);
      deployer.link(link, contractName);
    }
  },
  {
    contractName: "SumDAO",
    network: "ethereum",
    action: "deploy",
    dependencies: [],
    isCompleted: false,
    run: (network, contractName, deployer, artifacts) => {
      artifacts.require(contractName);
      deployer.deploy(contractName);
    }
  },
  {
    contractName: "ArbiDAO",
    network: "arbitrum",
    action: "deploy",
    dependencies: [],
    isCompleted: false,
    run: (network, contractName, deployer, artifacts) => {
      artifacts.require(contractName);
      deployer.deploy(contractName);
    }
  }
];
let yamlDeclarations;
let jsonDeclarations;
let yamlDeploymentSteps;
let jsonDeploymentSteps;
beforeAll(async () => {
  //first we make sure we can read the files
  yamlDeclarations = await Solver.Solver.read(yamlPath);
  jsonDeclarations = await Solver.Solver.read(jsonPath);
  //then we want to ensure the files are processed to produce an
  //ordered list of Truffle commands
  yamlDeploymentSteps = await Solver.Solver.orchestrate(yamlPath);
  jsonDeploymentSteps = await Solver.Solver.orchestrate(jsonPath);
});

describe("Solver", () => {
  test("reads a yaml file", () => {
    expect(yamlDeclarations).toBeDefined;
    expect(yamlDeclarations.deployed).toBeDefined;
  });
  test("reads a json file", () => {
    expect(jsonDeclarations).toBeDefined;
    // readFile returns the json file read as an array? @TODO look into this
    expect(jsonDeclarations[0].deployed).toBeDefined();
  });
  test("returns same data regardless of file extension", () => {
    expect(yamlDeclarations).toEqual(jsonDeclarations);
  });
  test("sorts the yaml file into a set of deployment steps", () => {
    //the file should be turned into an ordered list of truffle commands
    expect(yamlDeploymentSteps).toBeDefined();
    expect(yamlDeploymentSteps[0]).toEqual(expectedDeclarationTargets[0]);
    expect(yamlDeploymentSteps[1]).toEqual(expectedDeclarationTargets[1]);
  });
  test("sorts the yaml file into a set of deployment steps", () => {
    //the file should be turned into an ordered list of truffle commands
    expect(jsonDeploymentSteps).toBeDefined();
    expect(jsonDeploymentSteps[0]).toEqual(expectedDeclarationTargets[0]);
    expect(jsonDeploymentSteps[1]).toEqual(expectedDeclarationTargets[1]);
  });
});
