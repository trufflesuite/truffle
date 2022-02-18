import { TruffleDB } from "../../src";
import { expect } from "chai";

const os = require("os");

describe("TruffleDB", () => {
  let db: TruffleDB;
  let db2: TruffleDB;

  const tmpDirectory: string = os.tmpdir();

  let testConfig = {
    projectName: "default",
    databaseName: "testproject",
    databaseEngine: "leveldb",
    databaseDirectory: tmpDirectory,
    modelDirectories: []
  };

  const projectData = {
    id: 100,
    name: "test project",
    requiredNoDefault: "test"
  };

  afterEach(async () => {
    await db.levelDB.clear();
    db.close();
    if (db2) db.close();
  });

  describe("Instantiation", () => {
    it("instantiates with default config", () => {
      db = new TruffleDB();
      expect(db.config).to.eql(TruffleDB.DEFAULTS);
    });
    it("instantiates with a custom config", () => {
      db = new TruffleDB(testConfig);
      expect(db.config).to.eql(testConfig);
    });
    it("attaches db models to itself", () => {
      db = new TruffleDB();
      const { Project } = db.models;

      expect(typeof Project === "function").to.equal(true);
    });
    it("supports multiple processes connecting to the same leveldb instance", async () => {
      db = new TruffleDB();
      db2 = new TruffleDB();

      const project = await db.models.Project.create(projectData);
      const projects = await db2.models.Project.all();

      expect(projects[0]).to.eql(project);
    });
  });
});
