// @ts-nocheck
import { Storage } from "../../src/storage";
import { expect, assert } from "chai";

const os = require("os");

describe("Storage", () => {
  let tmpDir = os.tmpdir();
  const modelCount = 5; // models in testModels folder
  const testModelDirectory = [`${__dirname}/testModels`];

  const storageOptions = {
    databaseName: "storageTest",
    databaseEngine: "memory",
    databaseDirectory: tmpDir
  };

  it("has a list of available storage backends", () => {
    const backends = Storage.availableBackends;

    expect(Array.isArray(backends)).to.equal(true);
    expect(backends.length > 0).to.equal(true);
  });

  it("has a modelDirectory property with default value", () => {
    expect(Storage.modelDirectories.length > 0).to.equal(true);
  });
  it("has a modelBaseName property with default value", () => {
    expect(Storage.modelBaseName.length > 0).to.equal(true);
  });
  it("creates models from a list of model files", () => {
    const modelFiles = Storage.getModelFiles(testModelDirectory);

    const models = Storage.createModelsFromFiles(modelFiles);

    expect(Object.values(models).length === modelFiles.length).to.equal(true);
  });

  it("creates a levelDB instance", () => {
    const levelDB = Storage.createDB(storageOptions);

    expect(!!levelDB).to.equal(true);
  });

  it("attaches the database to the models", () => {
    const levelDB = Storage.createDB(storageOptions);
    const modelFiles = Storage.getModelFiles(testModelDirectory);

    const models = Storage.createModelsFromFiles(modelFiles);
    Storage.attachDatabaseToModels(models, levelDB);
    expect(typeof models.Project.levelDB === "object").to.equal(true);
  });

  it("attaches the models lookup to each model", () => {
    const levelDB = Storage.createDB(storageOptions);
    const modelFiles = Storage.getModelFiles(testModelDirectory);

    const models = Storage.createModelsFromFiles(modelFiles);
    Storage.attachDatabaseToModels(models, levelDB);

    expect(Object.keys(models.Project.models).length).to.equal(modelCount);
  });

  it("gets the model file names from the modelDirectory matching the modelBaseName pattern", () => {
    const modelFiles = Storage.getModelFiles(testModelDirectory);

    expect(modelFiles.length).to.equal(modelCount);
  });

  it("accepts additional model directories, overwrites default models of the same name", () => {
    const storageWithModelDirectory = {
      ...storageOptions,
      modelDirectories: testModelDirectory
    };

    let { levelDB, models } = Storage.createStorage(storageOptions);
    expect(!!levelDB).to.equal(true);

    let defaultModels = models;

    ({ models } = Storage.createStorage(storageWithModelDirectory));

    for (const key in defaultModels) {
      expect(!!models[key]).to.equal(true);
    }

    const modelDirectories = Storage.modelDirectories;
    expect(modelDirectories.length).to.equal(2);
  });

  describe("throws", () => {
    it("no model directories, or directories is not an array", () => {
      const invalidDirectory = "test";

      assert.throws(() => {
        Storage.getModelFiles(invalidDirectory),
          Error,
          "no model directories provided";
      });
      assert.throws(() => {
        Storage.getModelFiles(undefined),
          Error,
          "no model directories provided";
      });

      assert.throws(() => {
        // @ts-ignore
        Storage.getModelFiles(null), Error, "directory does not exist";
      });
    });
    it("invalid model directory throws", () => {
      const fakeDirectory = ["lkjasdlfkjasldkfjsdf"];

      assert.throws(() => {
        Storage.getModelFiles(fakeDirectory), Error, "directory does not exist";
      });

      assert.throws(() => {
        // @ts-ignore
        Storage.getModelFiles(null), Error, "directory does not exist";
      });
    });
    it("invalid model paths parameter", () => {
      assert.throws(
        () => {
          Storage.createModelsFromFiles([]);
        },
        Error,
        "files parameter is not an array of model paths"
      );
    });
    it("invalid model definition", () => {
      assert.throws(
        () => {
          Storage.createModelsFromFiles(["./models/invalidDefinition.js"]);
        },
        Error,
        /Cannot find module/
      );
    });
  });
});
