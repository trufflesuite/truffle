// @ts-nocheck
import { Storage } from "../../src/storage";
import { expect } from "chai";
const os = require("os");

describe("Network Genealogy", () => {
  const tmpDir = os.tmpdir();

  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let NetworkGenealogy;

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    levelDB = DB.levelDB;
    models = DB.models;

    NetworkGenealogy = models.NetworkGenealogy;
  });
  afterEach(() => {
    levelDB.close();
  });

  it("generates an id from the content addressable fields", () => {
    expect(typeof NetworkGenealogy).to.equal("function");
  });
  it("query ancestors");
  it("query ancestors with limit");
  it("query descendants");
  it("query descendants with limit");
  it("query with already tried");
  it("save");
  it("query");
  it("all");
});
