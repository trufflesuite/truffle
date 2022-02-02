// @ts-nocheck
import { expect } from "chai";
import { Storage } from "../src/storage";

const os = require("os");

describe("Model", () => {
  const testModelDirectory = `${__dirname}/models`;
  Storage.modelDirectory = testModelDirectory;
  const tmpDir = os.tmpdir();
  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let Project;

  let project = {
    id: 100,
    name: "project100",
    directory: "./db",
    requiredField: "roflcopter",
    requiredNoDefault: "test"
  };

  beforeEach(() => {
    const DB = Storage.createStorage(
      databaseEngine,
      databaseDirectory,
      databaseName
    );

    levelDB = DB.levelDB;
    models = DB.models;
    Project = models.Project;
  });
  afterEach(async () => {
    await levelDB.close();
  });

  describe("build", () => {
    it("returns a model instance", () => {
      const builtProject = Project.build(project);
      expect(builtProject).to.eql(project);
    });
    it("does not save the data", async () => {
      const builtProject = Project.build(project);
      expect(builtProject).to.eql(project);

      const storedProject = await Project.get(project.id);
      expect(storedProject).to.equal(undefined);
    });
    it("builds without a key field, sets key property, saves", async () => {
      const key = 12345;

      const builtProject = Project.build();
      builtProject.requiredNoDefault = "test"; // just a required field
      builtProject[builtProject.getKeyProperty()] = key;
      await builtProject.save();

      const storedProject = await Project.get(key);
      expect(storedProject).to.eql(builtProject);
    });
  });
  describe("create", () => {
    it("returns a model instance", async () => {
      const createdProject = await Project.create(project);
      expect(createdProject).to.eql(project);
    });
    it("saves the data", async () => {
      const createdProject = await Project.create(project);
      expect(createdProject).to.eql(project);

      const storedProject = await Project.get(project.id);
      expect(storedProject).to.eql(project);
    });
    it("throws if no LevelDB instance is set", async () => {
      Project.levelDB = null;

      let error;
      try {
        await Project.create(project);
      } catch (e) {
        error = e;
      }

      expect(error.message.indexOf("Model is not connected") > -1).to.equal(
        true
      );
    });
  });

  describe("get", () => {
    it("returns a model instance for a given key", async () => {
      await Project.create(project);

      const storedProject = await Project.get(project.id);

      expect(storedProject).to.eql(project);
    });
    it("returns undefined when a key does not exist", async () => {
      const invalidKey = -1;
      const storedProject = await Project.get(invalidKey);

      expect(storedProject).to.eql(undefined);
    });
  });

  describe("delete", () => {
    it("deletes a record for a given key", async () => {
      await Project.create(project);

      await Project.delete(project.id);
      const storedProject = await Project.get(project.id);

      expect(storedProject).to.equal(undefined);
    });
    it("safely deletes keys that do not exist", async () => {
      await Project.create(project);

      await Project.delete(project.id);
      await Project.delete(project.id);
    });
  });

  describe("bulk", () => {
    const modelsToCreate = 1000;
    const batchData = [];
    let batchKeys;
    before(async () => {
      for (let i = 0; i < modelsToCreate; i++) {
        batchData.push({ ...project, id: i, name: `project-${i}` });
      }

      batchKeys = batchData.map(data => {
        return data.id;
      });
    });
    describe("batchCreate", () => {
      it("returns an array of model instances", async () => {
        const modelInstances = await Project.batchCreate(batchData);

        expect(modelInstances.length).to.equal(modelsToCreate);

        expect(modelInstances[0].id).to.equal(batchData[0].id);
        expect(modelInstances[0].name).to.equal(batchData[0].name);
        expect(modelInstances[0].directory).to.equal(batchData[0].directory);
      });
      it("saves the model data", async () => {
        await Project.batchCreate(batchData);
        const project = await Project.get(batchData[0].id);

        expect(project.id).to.equal(batchData[0].id);
        expect(project.name).to.equal(batchData[0].name);
        expect(project.directory).to.equal(batchData[0].directory);
      });
    });
    describe("all", () => {
      beforeEach(async () => {
        await Project.batchCreate(batchData);
      });
      it("gets all records for the Model", async () => {
        const projects = await Project.all();

        expect(projects.length).to.equal(batchData.length);
        expect(projects[0].id).to.equal(batchData[0].id);
        expect(projects[0].name).to.equal(batchData[0].name);
        expect(projects[0].directory).to.equal(batchData[0].directory);
      });

      it("accepts gt(e), lt(e) option", async () => {
        const options = {
          gte: 500,
          lt: 505
        };
        const projects = await Project.all(options);

        expect(projects.length).to.equal(5);
      });
      it("accepts reverse and limit option", async () => {
        const theLimit = 5;
        const options = {
          reverse: true,
          limit: theLimit
        };
        const projects = await Project.all(options);

        expect(projects.length).to.equal(theLimit);
        expect(projects[0].id).to.eql(batchData[batchData.length - 1].id);
      });
    });

    describe("getMany", () => {
      beforeEach(async () => {
        await Project.batchCreate(batchData);
      });
      it("gets records based on an array of keys", async () => {
        const savedProjects = await Project.getMany(batchKeys);

        expect(savedProjects.length).to.equal(batchData.length);

        expect(savedProjects[0].id).to.equal(batchData[0].id);
        expect(savedProjects[0].name).to.equal(batchData[0].name);
        expect(savedProjects[0].directory).to.equal(batchData[0].directory);
      });
      it("gets an instance of same record if the same key is passed", async () => {
        const keys = [batchKeys[0], batchKeys[0]];
        const savedProjects = await Project.getMany(keys);
        expect(savedProjects.length).to.equal(2);
        expect(savedProjects[0]).to.eql(savedProjects[1]);
      });
    });

    describe("batchBuild", () => {
      it("batchBuild", async () => {
        const modelInstances = Project.batchBuild(batchData);

        expect(modelInstances.length).to.equal(modelsToCreate);
        expect(modelInstances[0].id).to.equal(batchData[0].id);
        expect(modelInstances[0].name).to.equal(batchData[0].name);
        expect(modelInstances[0].directory).to.equal(batchData[0].directory);

        let savedProjects = await Project.all();

        expect(savedProjects.length).to.equal(0);
      });
    });

    describe("batchDelete", () => {
      beforeEach(async () => {
        await Project.batchCreate(batchData);
      });
      it("deletes an array of ids", async () => {
        await Project.batchDelete(batchKeys);
      });
    });
  });
});
