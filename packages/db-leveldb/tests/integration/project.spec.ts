// @ts-nocheck
import { Storage } from "../../src/storage";
import { expect } from "chai";
const os = require("os");
const compileData = require("./data/workflow-compile/compile");

describe("Project", () => {
  const tmpDir = os.tmpdir();

  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let Project;

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    levelDB = DB.levelDB;
    models = DB.models;

    Project = models.Project;
  });
  afterEach(() => {
    levelDB.close();
  });

  it("sets the id to the name of the project", async () => {
    const project = await Project.create();

    project.name = "test";

    expect(project.generateID()).to.equal(project.name);
  });
  it("builds model instances for contracts and compilations added to the project", async () => {
    const { contracts, compilations } = compileData;

    const project = Project.build();

    project.contracts = contracts;
    project.compilations = compilations;

    project.contracts.forEach(contract => {
      expect(contract instanceof Project.models.Contract);
    });
    project.compilations.forEach(compilation => {
      expect(compilation instanceof Project.models.Compilation);
    });
  });
  it("returns the ids of the contracts", () => {
    const { contracts } = compileData;
    const project = Project.build();

    project.contracts = contracts;

    const ids = project.getContractIDs();

    expect(ids.length).to.equal(project.contracts.length);
  });
  it("returns the ids of the compilations", () => {
    const { compilations } = compileData;
    const project = Project.build();

    project.compilations = compilations;

    const ids = project.getCompilationIDs();

    expect(ids.length).to.equal(project.compilations.length);
  });

  it("saves the contracts and compilations on a project save", async () => {
    const { contracts, compilations } = compileData;

    const project = await Project.create();

    project.contracts = contracts;
    project.compilations = compilations;

    await project.save();

    const { Contract, Compilation } = Project.models;
    const contractIDs = project.getContractIDs();

    contractIDs.forEach(async id => {
      expect(await Contract.get(id)).to.exist();
    });

    const compilationIDs = project.getCompilationIDs();

    compilationIDs.forEach(async id => {
      expect(await Compilation.get(id)).to.exist();
    });
  });
});
