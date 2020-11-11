const assert = require("chai").assert;
const Box = require("@truffle/box");
const Artifactor = require("@truffle/artifactor");
const Resolver = require("@truffle/resolver");
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/config");
const path = require("path");
const fs = require("fs-extra");
const glob = require("glob");
const Config = require("@truffle/config");

describe("config", function () {
  let config;
  let output = "";
  let memStream;

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
  });

  beforeEach(() => {
    memStream = new MemoryStream();
    memStream.on("data", data => {
      output += data.toString();
    });
  });

  after("Cleanup tmp files", async () => {
    const files = glob.sync("tmp-*");
    files.forEach(file => fs.removeSync(file));
  });

  afterEach("Clear MemoryStream", () => {
    memStream.end("");
    output = "";
  });

  it("retrieves the default migrations directory", async () => {
    await command.run({
      working_directory: config.working_directory,
      _: ["get", "migrations_directory"],
      logger: config.logger
    });
    const expected = path.join(config.working_directory, "./migrations");
    assert.equal(output, expected);
  });

  it("retrieves an adjusted migrations directory", async () => {
    const configFile = Config.search({
      working_directory: config.working_directory
    });
    fs.writeFileSync(
      configFile,
      "module.exports = { migrations_directory: './a-different-dir' };",
      {encoding: "utf8"}
    );

    await command.run({
      working_directory: config.working_directory,
      _: ["get", "migrations_directory"],
      logger: config.logger
    });
    const expected = path.join(config.working_directory, "./a-different-dir");
    assert.equal(output, expected);
  });
});
