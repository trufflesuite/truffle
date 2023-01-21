import { Runner } from "@truffle/solver";
import { DeploymentSteps } from "../types";
import Config from "@truffle/config";

const expectedDeclarationTargets: DeploymentSteps = [
  {
    contractName: "SafeMathLib",
    network: "ethereum",
    links: [],
    isCompleted: false,
    run: ["deploy"]
  },
  {
    contractName: "SumDAO",
    network: "ethereum",
    links: ["SafeMathLib"],
    isCompleted: false,
    run: ["deploy", "link"]
  },
  {
    contractName: "SumDAOAgain",
    network: "arbitrum",
    links: [],
    isCompleted: false,
    run: ["deploy"]
  },
  {
    contractName: "ArbiDAO",
    network: "arbitrum",
    links: ["SumDAOAgain"],
    isCompleted: false,
    run: ["deploy", "link"]
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
  runnerResult = await Runner.orchestrate(
    expectedDeclarationTargets,
    Config.default()
  );
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
