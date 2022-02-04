// @ts-nocheck
import { expect } from "chai";
import { Storage } from "../../src/storage";

const os = require("os");

describe("Generate ID", () => {
  const testModelDirectory = `${__dirname}/testModels`;
  Storage.modelDirectory = testModelDirectory;
  const tmpDir = os.tmpdir();
  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;

  let GenerateID;
  const soliditySHA3HashAnswer =
    "0x5190734208e3b85ce411083a60a9c5a25a3ac44f9aef6e9d4450ac15cc7449e3";

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    levelDB = DB.levelDB;

    GenerateID = DB.models.GenerateID;
  });
  afterEach(async () => {
    await levelDB.close();
  });

  it("returns an id from a defined function based on model instance properties", async () => {
    const example = GenerateID.build();

    expect(example.generateID()).to.equal(soliditySHA3HashAnswer);
  });
  it("has a custom beforeSave hook to generate the ID on the save operation", async () => {
    const example = GenerateID.build();
    await example.beforeSave();

    expect(example.id).to.equal(soliditySHA3HashAnswer);
  });
  it("updates the id when fields change, removes the old record", async () => {
    const example = GenerateID.build();
    await example.save();

    expect(example.id).to.equal(soliditySHA3HashAnswer);

    const oldId = example.id;

    example.fieldA = "new data!";

    await example.save();
    expect(oldId !== example.id).to.equal(true);

    expect(await GenerateID.get(oldId)).to.equal(undefined);
  });
});
