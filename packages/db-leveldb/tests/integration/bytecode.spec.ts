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
    "0x3ecd59fbc26f2cb9feeda956ebc022bcb78467e15ed226e7ecdc939c90a7a34d";

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
  it("query", async () => {
    const bytecode = await Bytecode.create(shimmedBytecode);

    const query = { bytes: shimmedBytecode.bytes };
    const savedBytecode = await Bytecode.find(query);

    expect(bytecode).to.eql(savedBytecode[0]);
  });
});
