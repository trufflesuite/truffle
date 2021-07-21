const assert = require("chai").assert;
const { default: Box } = require("@truffle/box");
const WorkflowCompile = require("@truffle/workflow-compile");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver");
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/compile");
const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");

const makeResolveSource = config => async contractSourcePath => {
  const { filePath } = await config.resolver.resolve(
    contractSourcePath,

    // to pretend we're inside the contracts directory
    path.join(config.contracts_directory, "_")
  );

  return filePath;
};

const makeUpdateSources = config => {
  const resolveSource = makeResolveSource(config);

  return async contractSourcePaths => {
    // convert (e.g.) "ConvertLib.sol" to "/path/to/contracts/ConvertLib.sol"
    const filePaths = await Promise.all(contractSourcePaths.map(resolveSource));

    const stats = {};
    for (const filePath of filePaths) {
      stats[filePath] = fs.statSync(filePath);

      var newTime = new Date().getTime();
      fs.utimesSync(filePath, newTime, newTime);
    }

    return () => {
      for (const [filePath, stat] of Object.entries(stats)) {
        fs.utimesSync(filePath, stat.atime, stat.mtime);
      }
    };
  };
};

describe("compile", function () {
  let config;
  let output = "";
  let memStream;
  let updateSources;

  before("Create a sandbox", async () => {
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.networks = {
      default: {
        network_id: "1"
      },
      secondary: {
        network_id: "12345"
      }
    };
    config.network = "default";
    config.logger = {log: val => val && memStream.write(val)};

    updateSources = makeUpdateSources(config);
  });

  after("Cleanup tmp files", async function () {
    const files = glob.sync("tmp-*");
    files.forEach(file => fs.removeSync(file));
  });

  afterEach("Clear MemoryStream", () => (output = ""));

  it("compiles all initial contracts", async function () {
    const {contracts} = await WorkflowCompile.compileAndSave(
      config.with({
        all: false,
        quiet: true
      })
    );
    assert.equal(
      Object.keys(contracts).length,
      3,
      "Didn't compile the expected number of contracts"
    );
  });

  it("compiles no contracts after no updates", async function () {
    const {contracts} = await WorkflowCompile.compileAndSave(
      config.with({
        all: false,
        quiet: true
      })
    );
    assert.equal(
      Object.keys(contracts).length,
      0,
      "Compiled a contract even though we weren't expecting it"
    );
  });

  it("compiles one specified contract after three are updated", async function () {
    this.timeout(10000);

    const reset = await updateSources([
      "ConvertLib.sol",
      "MetaCoin.sol",
      "Migrations.sol"
    ]);

    try {
      const { contracts } = await WorkflowCompile.compileAndSave(
        config.with({
          all: false,
          quiet: true,
          specificFiles: [
            path.resolve(config.contracts_directory, "ConvertLib.sol")
          ]
        })
      );

      assert.equal(
        Object.keys(contracts).length,
        2, //ConvertLib.sol is imported by MetaCoin.sol so there should be two files.
        "Didn't compile specified contracts."
      );
    } finally {
      reset();
    }
  });

  it("compiles updated contract and its ancestors", async function () {
    this.timeout(10000);

    const reset = await updateSources(["ConvertLib.sol"]);
    try {
      const { contracts } = await WorkflowCompile.compileAndSave(
        config.with({
          all: false,
          quiet: true
        })
      );

      assert.equal(
        Object.keys(contracts).length,
        2,
        "Expected MetaCoin and ConvertLib to be compiled"
      );
    } finally {
      // reset time
      reset();
    }
  });

  it("compiling shouldn't create any network artifacts", function () {
    const contract = config.resolver.require("MetaCoin.sol");
    assert.equal(
      Object.keys(contract.networks).length,
      0,
      "Expected the contract to be managing zero networks"
    );
  });

  describe("solc listing options", function () {
    beforeEach(() => {
      memStream = new MemoryStream();
      memStream.on("data", function (data) {
        output += data.toString();
      });
    });

    it("prints a truncated list of solcjs versions", async function () {
      const options = {
        list: ""
      };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length === 11);
      });
      memStream.end("");
    });

    it("prints a list of docker tags", async function () {
      const options = {
        list: "docker"
      };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length === 11);
        assert(typeof arr[0] === "string");
      });
      memStream.end("");
    });

    it("prints a full list of releases when --all is set", async function () {
      const options = {
        list: "releases",
        all: true
      };

      await command.run(config.with(options));
      memStream.on("end", () => {
        const arr = JSON.parse(output);
        assert(arr.length > 11);
        assert(typeof arr[0] === "string");
      });
      memStream.end("");
    });
  });
});
