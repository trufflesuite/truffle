const debug = require("debug")("test:targets");

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const temp = require("temp").track();
const assert = require("chai").assert;
const web3 = {};
web3.utils = require("web3-utils");

const { processTarget, DEFAULT_ABI } = require("..");

describe("Compilation Targets", () => {
  let cwd;

  before("make temporary directory", async () => {
    cwd = await promisify(temp.mkdir)("external-targets");
  });

  describe("Property outputs", () => {
    const contractName = "MyContract";

    it("includes default ABI when not specified", async () => {
      const abi = DEFAULT_ABI;

      const target = {
        properties: {
          contractName
        }
      };

      const expected = {
        [contractName]: { contractName, abi },
      };

      const actual = await processTarget(target, cwd);

      assert.deepEqual(actual, expected);
    });

    it("reads JSON file properties", async () => {
      const bytecode = "0x603160008181600b";
      const bytecodeFile = "bytecode.json";
      const fileContents = JSON.stringify(bytecode);

      fs.writeFileSync(path.join(cwd, bytecodeFile), fileContents);

      const target = {
        properties: {
          contractName
        },
        fileProperties: {
          bytecode: bytecodeFile
        }
      };

      const processed = await processTarget(target, cwd);

      assert.equal(processed[contractName].bytecode, bytecode);
    });

    it("reads hex-string file properties", async () => {
      const bytecode = "0x603160008181600b";
      const bytecodeFile = "bytecode";
      const fileContents = bytecode;

      fs.writeFileSync(path.join(cwd, bytecodeFile), fileContents);

      const target = {
        properties: {
          contractName
        },
        fileProperties: {
          bytecode: bytecodeFile
        }
      };

      const processed = await processTarget(target, cwd);

      assert.equal(processed[contractName].bytecode, bytecode);
    });

    it("reads UTF-8 file properties", async () => {
      const contractName = "My😀Contract";
      const contractNameFile = "contractName";
      const fileContents = JSON.stringify(contractName);

      fs.writeFileSync(path.join(cwd, contractNameFile), fileContents);

      const target = {
        fileProperties: {
          contractName: contractNameFile
        }
      };

      const processed = await processTarget(target, cwd);

      assert.equal(processed[contractName].contractName, contractName);
    });

    it("reads raw binary file properties", async () => {
      const bytecode = "0x603160008181600b";
      const bytecodeFile = "bytecode.bin";
      const fileContents = new Uint8Array(web3.utils.hexToBytes(bytecode));

      fs.writeFileSync(path.join(cwd, bytecodeFile), fileContents);

      const target = {
        properties: {
          contractName
        },
        fileProperties: {
          bytecode: bytecodeFile
        }
      };

      const processed = await processTarget(target, cwd);

      assert.equal(processed[contractName].bytecode, bytecode);
    });
  });
});
