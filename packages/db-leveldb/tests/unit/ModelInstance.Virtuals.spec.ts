// @ts-nocheck
import { expect } from "chai";
import { Storage } from "../../src/storage";

const os = require("os");

describe("Generate ID", () => {
  const modelDirectories = [`${__dirname}/testModels`];

  const tmpDir = os.tmpdir();
  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let Virtual;

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName,
      modelDirectories
    });

    levelDB = DB.levelDB;

    Virtual = DB.models.Virtual;
  });
  afterEach(async () => {
    await levelDB.close();
  });

  it("gets a virtual fullName property", async () => {
    const firstName = "First";
    const lastName = "Last";
    const virtual = Virtual.build({ firstName, lastName });

    const fullName = `${firstName} ${lastName}`;

    expect(virtual.fullName).to.equal(fullName);
  });
  it("sets a virtual fullName property", async () => {
    const fullName = "FirstName lastName";
    const virtual = Virtual.build();

    virtual.fullName = fullName;

    const [firstName, lastName] = fullName.split(" ");

    expect(virtual.fullName).to.equal(fullName);
    expect(virtual.firstName).to.equal(firstName);
    expect(virtual.lastName).to.equal(lastName);
  });
});
