// @ts-nocheck
import { TruffleDB } from "../../src";
import { expect } from "chai";

const compileData = require("./data/workflow-compile/compile");

describe("Project", () => {
  let db;

  beforeEach(() => {
    db = new TruffleDB();
  });

  it("Add workflow compile data to a project", async () => {
    const { contracts, compilations } = compileData;

    const project = await db.getProject();

    project.contracts = contracts;
    project.compilations = compilations;

    await project.save();

    const savedProject = await db.models.Project.get(project.id);

    expect(savedProject).to.eql(project);
  });
  it("saves the contracts and compilations on a project save", async () => {
    const { contracts, compilations } = compileData;

    const project = await db.getProject();

    project.contracts = contracts;
    project.compilations = compilations;

    await project.save();

    const { Contract, Compilation } = db.models;
    const contractIDs = project.getContractIDs();

    contractIDs.forEach(async id => {
      expect(await Contract.get(id)).to.exist();
    });

    const compilationIDs = project.getCompilationIDs();

    compilationIDs.forEach(async id => {
      expect(await Compilation.get(id)).to.exist();
    });
  });
  it("save");
  it("lookup names");
  it("enumerate resources");
});
