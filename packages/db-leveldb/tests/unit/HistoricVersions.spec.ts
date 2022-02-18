// @ts-nocheck
import { expect } from "chai";
import { Storage } from "../../src/storage";

const os = require("os");

describe("Historical Versions", () => {
  const modelDirectories = [`${__dirname}/testModels`];

  const tmpDir = os.tmpdir();
  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let Project;
  const projectData = {
    id: 100,
    name: "project100",
    directory: "./db",
    requiredField: "roflcopter",
    requiredNoDefault: "test"
  };

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName,
      modelDirectories
    });

    levelDB = DB.levelDB;
    models = DB.models;
    Project = models.Project;
  });
  afterEach(async () => {
    await levelDB.close();
  });

  describe("Model Instance", () => {
    it("on save, stores a snapshot of the data in a historical namespace", async () => {
      const savedProject = await Project.create(projectData);
      let historicalVersionCount = await savedProject.historyCount();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      savedProject.name = "version 3";
      await savedProject.save();

      historicalVersionCount = await savedProject.historyCount();

      expect(historicalVersionCount).to.equal(3);
    });
    it("returns all the historical versions of the data", async () => {
      const savedProject = await Project.create(projectData);
      let historicalVersionCount = await savedProject.historyCount();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      savedProject.name = "version 3";
      await savedProject.save();

      const historicalData = await savedProject.history();

      expect(historicalData.length).to.equal(3);
      expect(historicalData[0].name === projectData.name);
      expect(historicalData[2].name === savedProject.name);
    });
    it("supports limit and reverse (getFirst, getLast)", async () => {
      const savedProject = await Project.create(projectData);
      let historicalVersionCount = await savedProject.historyCount();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      savedProject.name = "version 3";
      await savedProject.save();

      const lastVersion = await savedProject.history(1, true);
      const firstVersion = await savedProject.history(1);

      expect(firstVersion.length).to.equal(1);
      expect(firstVersion[0].name).to.equal(projectData.name);

      expect(lastVersion.length).to.equal(1);
      expect(lastVersion[0].name).to.equal(savedProject.name);
    });
    it("only saves historical snapshots if the data has changed", async () => {
      const savedProject = await Project.create(projectData);
      await savedProject.save();
      await savedProject.save();
      await savedProject.save();

      let historicalVersionCount = await savedProject.historyCount();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      historicalVersionCount = await savedProject.historyCount();

      expect(historicalVersionCount).to.equal(2);
    });
    it("gets a diff for a range of historical snapshots", async () => {
      const v2Name = "version 2";
      const v3Name = "version 3";

      const savedProject = await Project.create(projectData);

      savedProject.name = v2Name;
      await savedProject.save();

      savedProject.name = v3Name;
      await savedProject.save();

      let historyDiff = await savedProject.historyDiff();

      expect(historyDiff.length).to.equal(2);

      expect(historyDiff[1].name.__old).to.equal(projectData.name);
      expect(historyDiff[1].name.__new).to.equal(v2Name);

      expect(historyDiff[0].name.__old).to.equal(v2Name);
      expect(historyDiff[0].name.__new).to.equal(v3Name);
    });
    it("returns an empty diff if there are < 2 historical versions", async () => {
      const savedProject = await Project.create(projectData);
      let historyDiff = await savedProject.historyDiff();

      expect(historyDiff.length).to.equal(0);

      savedProject.name = "new name that won't be tested";
      await savedProject.save();
      historyDiff = await savedProject.historyDiff();

      expect(historyDiff.length).to.equal(1);
    });
    it("limits the range of history from the most recent changes", async () => {
      const v2Name = "version 2";
      const v3Name = "version 3";

      const savedProject = await Project.create(projectData);

      savedProject.name = v2Name;
      await savedProject.save();

      savedProject.name = v3Name;
      await savedProject.save();

      let historyDiff = await savedProject.historyDiff(1);

      expect(historyDiff.length).to.equal(1);

      historyDiff = await savedProject.historyDiff(2);
      expect(historyDiff.length).to.equal(2);
    });
    it("builds a model instance from the historic data", async () => {
      const v2Name = "version 2";
      const v3Name = "version 3";

      const savedProject = await Project.create(projectData);

      savedProject.name = v2Name;
      await savedProject.save();

      savedProject.name = v3Name;
      await savedProject.save();

      const history = await savedProject.history();

      const historicProject = Project.build(history[history.length - 1]);

      expect(historicProject instanceof Project);
    });
  });
  describe("Model", () => {
    describe("history", () => {
      it("gets historical data for a key", async () => {
        const savedProject = await Project.create(projectData);

        savedProject.name = "new version";
        await savedProject.save();

        const historicalVersions = await Project.history(savedProject.id);

        expect(historicalVersions.length).to.equal(2);
      });
      it("gets historical data for a deleted record", async () => {
        const savedProject = await Project.create(projectData);

        savedProject.name = "new version";
        await savedProject.save();

        await Project.delete(savedProject.id);

        const historicalVersions = await Project.history(savedProject.id);

        expect(historicalVersions.length).to.equal(2);
      });
      it("contains historical data even when a deleted key is reused", async () => {
        const savedProject = await Project.create(projectData);

        savedProject.name = "new version";
        await savedProject.save();

        await Project.delete(savedProject.id);

        await Project.create({ ...projectData, name: "reused" });

        const historicalVersions = await Project.history(savedProject.id);

        expect(historicalVersions.length).to.equal(3);
        expect(historicalVersions[2].name).to.equal("reused");
      });
      it("supports limit and reverse (getFirst, getLast)", async () => {
        const savedProject = await Project.create(projectData);
        let historicalVersionCount = await savedProject.historyCount();

        expect(historicalVersionCount).to.equal(1);

        savedProject.name = "version 2";
        await savedProject.save();

        savedProject.name = "version 3";
        await savedProject.save();

        const lastVersion = await Project.history(savedProject.id, 1, true);
        const firstVersion = await Project.history(savedProject.id, 1);

        expect(firstVersion.length).to.equal(1);
        expect(firstVersion[0].name).to.equal(projectData.name);

        expect(lastVersion.length).to.equal(1);
        expect(lastVersion[0].name).to.equal(savedProject.name);
      });
    });
  });
});
