// @ts-nocheck
import { Storage } from "../../src/storage";
import { expect } from "chai";
const os = require("os");

describe("Compilation", () => {
  const tmpDir = os.tmpdir();

  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let Compilation;

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    levelDB = DB.levelDB;
    models = DB.models;

    Compilation = models.Compilation;
  });
  afterEach(() => {
    levelDB.close();
  });

  it("generates an id from the content addressable fields", () => {
    expect(typeof Compilation).to.equal("function");
  });
  it("save");
  it("query");
  it("all");
});
