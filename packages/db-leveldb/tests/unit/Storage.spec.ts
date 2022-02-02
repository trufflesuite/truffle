import { Storage } from "../../src/storage";
import { expect, assert } from "chai";

const os = require("os");

describe("Storage", () => {
  let tmpDir = os.tmpdir();
  const testModelDirectory = `${__dirname}/models`;

  const storageOptions = {
    databaseName: "storageTest",
    databaseBackend: "memory",
    databaseDirectory: tmpDir
  };

  it("has a list of available storage backends", () => {
    const backends = Storage.availableBackends;

    expect(Array.isArray(backends)).to.equal(true);
    expect(backends.length > 0).to.equal(true);
  });

  it("has a modelDirectory property with default value", () => {
    expect(Storage.modelDirectory.length > 0).to.equal(true);
  });
  it("has a modelBaseName property with default value", () => {
    expect(Storage.modelBaseName.length > 0).to.equal(true);
  });

  it("creates models from a list of model files", () => {
    const modelFiles = Storage.getModelFilesFromDirectory(testModelDirectory);

    const models = Storage.createModelsFromFiles(modelFiles);

    expect(Object.values(models).length === modelFiles.length).to.equal(true);
  });

  it("creates a levelDB instance", () => {
    const levelDB = Storage.createDB(storageOptions);

    expect(!!levelDB).to.equal(true);
  });
  it("attaches the models to a database", () => {
    const levelDB = Storage.createDB(storageOptions);
    const modelFiles = Storage.getModelFilesFromDirectory(testModelDirectory);

    const models = Storage.createModelsFromFiles(modelFiles);
    Storage.attachModelsToDatabase(models, levelDB);
    expect(typeof models.Project.levelDB === "object").to.equal(true);
  });

  it("gets the model file names from the modelDirectory matching the modelBaseName pattern", () => {
    const modelFiles = Storage.getModelFilesFromDirectory(testModelDirectory);

    expect(modelFiles.length).to.equal(3);
  });
  describe("throws", () => {
    it("invalid model folder throws", () => {
      const fakeFolder = "lkjasdlfkjasldkfjsdf";

      assert.throws(() => {
        Storage.getModelFilesFromDirectory(fakeFolder),
          Error,
          "folder does not exist";
      });

      assert.throws(() => {
        // @ts-ignore
        Storage.getModelFilesFromDirectory(null),
          Error,
          "folder does not exist";
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
