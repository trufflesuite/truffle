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
      let historicalVersionCount = await savedProject.countHistoricalVersions();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      savedProject.name = "version 3";
      await savedProject.save();

      historicalVersionCount = await savedProject.countHistoricalVersions();

      expect(historicalVersionCount).to.equal(3);
    });
    it("returns all the historical versions of the data", async () => {
      const savedProject = await Project.create(projectData);
      let historicalVersionCount = await savedProject.countHistoricalVersions();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      savedProject.name = "version 3";
      await savedProject.save();

      const historicalData = await savedProject.getHistoricalVersions();

      expect(historicalData.length).to.equal(3);
      expect(historicalData[0].name === projectData.name);
      expect(historicalData[2].name === savedProject.name);
    });
    it("supports limit and reverse (getFirst, getLast)", async () => {
      const savedProject = await Project.create(projectData);
      let historicalVersionCount = await savedProject.countHistoricalVersions();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      savedProject.name = "version 3";
      await savedProject.save();

      const lastVersion = await savedProject.getHistoricalVersions(1, true);
      const firstVersion = await savedProject.getHistoricalVersions(1);

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

      let historicalVersionCount = await savedProject.countHistoricalVersions();

      expect(historicalVersionCount).to.equal(1);

      savedProject.name = "version 2";
      await savedProject.save();

      historicalVersionCount = await savedProject.countHistoricalVersions();

      expect(historicalVersionCount).to.equal(2);
    });
  });
  describe("Model", () => {
    describe("getHistoricalVersions", () => {
      it("gets historical data for a key", async () => {
        const savedProject = await Project.create(projectData);

        savedProject.name = "new version";
        await savedProject.save();

        const historicalVersions = await Project.getHistoricalVersions(
          savedProject.id
        );

        expect(historicalVersions.length).to.equal(2);
      });
      it("gets historical data for a deleted record", async () => {
        const savedProject = await Project.create(projectData);

        savedProject.name = "new version";
        await savedProject.save();

        await Project.delete(savedProject.id);

        const historicalVersions = await Project.getHistoricalVersions(
          savedProject.id
        );

        expect(historicalVersions.length).to.equal(2);
      });
      it("contains historical data even when a deleted key is reused", async () => {
        const savedProject = await Project.create(projectData);

        savedProject.name = "new version";
        await savedProject.save();

        await Project.delete(savedProject.id);

        await Project.create({ ...projectData, name: "reused" });

        const historicalVersions = await Project.getHistoricalVersions(
          savedProject.id
        );

        expect(historicalVersions.length).to.equal(3);
        expect(historicalVersions[2].name).to.equal("reused");
      });
      it("supports limit and reverse (getFirst, getLast)", async () => {
        const savedProject = await Project.create(projectData);
        let historicalVersionCount =
          await savedProject.countHistoricalVersions();

        expect(historicalVersionCount).to.equal(1);

        savedProject.name = "version 2";
        await savedProject.save();

        savedProject.name = "version 3";
        await savedProject.save();

        const lastVersion = await Project.getHistoricalVersions(
          savedProject.id,
          1,
          true
        );
        const firstVersion = await Project.getHistoricalVersions(
          savedProject.id,
          1
        );

        expect(firstVersion.length).to.equal(1);
        expect(firstVersion[0].name).to.equal(projectData.name);

        expect(lastVersion.length).to.equal(1);
        expect(lastVersion[0].name).to.equal(savedProject.name);
      });
    });
  });
});
