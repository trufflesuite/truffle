// @ts-nocheck
import { TruffleDB } from "../../src";
import { expect } from "chai";

const os = require("os");
const WorkflowCompile = require("./mocks/workflow-compile");
const compileData = require("./data/workflow-compile/compile");

describe("Workflow Compile", () => {
  let db;
  let databaseDirectory = os.tmpdir() + "/workflow-compile";

  const workflowCompileConfig = {
    db: {
      enabled: true,
      projectName: "workflow-compile-test",
      databaseName: "truffledb",
      databaseEngine: "leveldb",
      databaseDirectory
    },
    contracts_build_directory: os.tmpdir(),
    contracts_directory: os.tmpdir()
  };

  beforeEach(() => {
    db = new TruffleDB(workflowCompileConfig.db);
  });

  afterEach(async () => {
    await db.levelDB.clear();
    await db.close();
  });

  it("save workflow compile data to a project", async () => {
    const { contracts, compilations } = compileData;

    await WorkflowCompile.save(workflowCompileConfig, {
      contracts,
      compilations
    });

    const project = await db.getProject();

    expect(project.compilations.length).to.equal(compilations.length);
    expect(project.contracts.length).to.equal(contracts.length);

    Object.keys(project.compilations[0]).forEach(key => {
      if (key === "id") return;
      expect(project.compilations[0][key]).to.eql(compilations[0][key]);
    });

    Object.keys(project.contracts[0]).forEach(key => {
      if (key === "id") return;
      expect(project.contracts[0][key]).to.eql(contracts[0][key]);
    });
  });
  it("gets the history of workflow compile saves for the project", async () => {
    const { contracts, compilations } = compileData;

    for (let i = 0; i < contracts.length; i++) {
      await WorkflowCompile.save(workflowCompileConfig, {
        contracts: [contracts[i]],
        compilations
      });
    }

    const project = await db.getProject();
    const projectHistory = await project.history();

    expect(projectHistory.length).to.equal(contracts.length + 1); // 0 is state at creation

    projectHistory.shift(); // remove initial state

    for (let i = 1; i < projectHistory.length; i++) {
      const p = db.models.Project.build(projectHistory[i]);
      expect(p.contracts[0].contractName).to.equal(contracts[i].contractName);
    }
  });
});
