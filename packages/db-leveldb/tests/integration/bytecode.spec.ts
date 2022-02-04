// @ts-nocheck
import { Shims } from "@truffle/compile-common";
import { Storage } from "../../src/storage";
import { expect } from "chai";
const os = require("os");
const ContractArtifact = require("./data/artifacts/CollisionTest.json");

describe("Bytecode", () => {
  const tmpDir = os.tmpdir();
  let databaseName = "truffledbTest";
  let databaseEngine = "memory";
  let databaseDirectory = tmpDir;

  let levelDB;
  let models: object;
  let Bytecode;

  const shimmedBytecode = Shims.LegacyToNew.forBytecode(
    ContractArtifact.bytecode
  );
  const shimmedBytecodeID =
    "0x3ae9187a8f676e45d39b06305dc9257e8cb80eb4a777ec308282d0a0d586cd9c";

  beforeEach(() => {
    const DB = Storage.createStorage({
      databaseEngine,
      databaseDirectory,
      databaseName
    });

    levelDB = DB.levelDB;
    models = DB.models;

    Bytecode = models.Bytecode;
  });
  afterEach(() => {
    levelDB.close();
  });

  it("generates an id from the content addressable fields", () => {
    const bytecode = Bytecode.build(shimmedBytecode);
    expect(bytecode.generateID()).to.equal(shimmedBytecodeID);
  });
  it("create", async () => {
    const bytecode = await Bytecode.create(shimmedBytecode);
    expect(bytecode.id).to.equal(shimmedBytecodeID);

    const savedBytecode = await Bytecode.get(bytecode.id);
    expect(bytecode).to.eql(savedBytecode);
  });
  it("query");
});
