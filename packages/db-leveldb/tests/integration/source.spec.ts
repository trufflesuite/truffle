// @ts-nocheck
import { Storage } from "../../src/storage";
import { expect } from "chai";
const os = require("os");
const MigrationArtifacts = require("./data/artifacts/Migrations.json");

describe("Source", () => {
  const tmpDir = os.tmpdir();

  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let Source;

  const sourceData = {
    contents: MigrationArtifacts.source,
    sourcePath: MigrationArtifacts.sourcePath
  };

  const sourceID =
    "0x12de244690d403d912449f5eb95329b9c3f99c71d8539cc4f66a37b9bc78fdc1";

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    levelDB = DB.levelDB;
    models = DB.models;

    Source = models.Source;
  });
  afterEach(() => {
    levelDB.close();
  });

  it("generates an id from the content addressable fields", async () => {
    const source = Source.build(sourceData);

    Source.content = sourceData.source;
    Source.sourcePath = sourceData.sourcePath;

    await source.beforeSave();

    expect(source.id).to.equal(sourceID);
  });
  it("query", async () => {
    await Source.create(sourceData);

    const source = await Source.find({
      sourcePath: MigrationArtifacts.sourcePath
    });

    expect(source[0].contents).to.equal(sourceData.contents);
  });
  it("save", async () => {
    await Source.create(sourceData);

    const source = await Source.get(sourceID);

    expect(source.contents).to.equal(sourceData.contents);
  });
  it("all", async () => {
    await Source.create(sourceData);
    await Source.create({ contents: "test", sourcePath: "rofl" });

    const sources = await Source.all();

    expect(sources.length).to.equal(2);
  });
});
