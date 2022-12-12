const assert = require("chai").assert;
const MemoryStream = require("memorystream");
const command = require("../../../lib/commands/config");
const path = require("path");
const fse = require("fs-extra");
const Config = require("@truffle/config");
const { createTestProject } = require("../../helpers");

describe("config", function () {
  let config;
  let output = "";
  let memStream;

  beforeEach(function () {
    config = createTestProject(path.join(__dirname, "../../sources/metacoin"));
    config.logger = { log: val => val && memStream.write(val) };
    memStream = new MemoryStream();
    memStream.on("data", data => {
      output += data.toString();
    });
  });

  afterEach("Clear MemoryStream", () => {
    memStream.end("");
    output = "";
  });

  it("retrieves the default migrations directory", async function () {
    await command.run({
      working_directory: config.working_directory,
      _: ["get", "migrations_directory"],
      logger: config.logger
    });
    const expected = path.join(config.working_directory, "./migrations");
    assert.equal(output, expected);
  });

  it("retrieves an adjusted migrations directory", async function () {
    const configFile = Config.search({
      working_directory: config.working_directory
    });
    fse.writeFileSync(
      configFile,
      "module.exports = { migrations_directory: './a-different-dir' };",
      { encoding: "utf8" }
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
