import { Runner } from "@truffle/solver";

const expectedDeclarationTargets = [
  {
    contractName: "SafeMathLib",
    network: "ethereum",
    action: "deploy",
    dependencies: [],
    isCompleted: () => {
      return false;
    },
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
    isCompleted: () => {
      return false;
    },
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
    isCompleted: () => {
      return false;
    },
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
    isCompleted: () => {
      return false;
    },
    run: (network, contractName, deployer, artifacts) => {
      artifacts.require(contractName);
      deployer.deploy(contractName);
    }
  }
];
const expectedResult = [
  {
    contractName: "SafeMathLib",
    network: "ethereum",
    completed: true,
    output: "..."
  }
];
let runnerResult;
beforeAll(async () => {
  runnerResult = await Runner.orchestrate(expectedDeclarationTargets, {});
});

describe("Runner", () => {
  test("runs the steps provided, in order", () => {
    expect(runnerResult).toBeDefined;
    expect(runnerResult[0].contractName).toBe(expectedResult[0].contractName);
  });
  test("respects the network specified in each step", () => {
    expect(runnerResult[0].network).toBe(expectedResult[0].network);
  });
  test("runs scripts in the order specified", () => {
    //add test here when scripts added to this
  });
  test("returns the result of each step", () => {
    expect(runnerResult[0].output).toBeDefined;
  });
});
