const CommandRunner = require("../commandrunner");
const sandbox = require("../sandbox");
const path = require("path");
const assert = require("assert");
const fse = require("fs-extra");

const updateFile = (filename, config) => {
  const fileToUpdate = path.resolve(
    path.join(config.contracts_directory, filename)
  );

  // Update the modification time to simulate an edit.
  const newTime = new Date().getTime();
  fse.utimesSync(fileToUpdate, newTime, newTime);
};

describe("Test", () => {
  let config;

  beforeEach("set up config for logger", async () => {
    config = await sandbox.create(path.resolve("test", "sources", "test"));
  });

  it("will run on a simple sample project", async () => {
    await CommandRunner.run("truffle test", config);
  });

  it("compiles/creates artifacts for out of sync sources", async () => {
    await CommandRunner.run("truffle compile", config);
    const timeModified = fse.statSync(
      path.join(config.contracts_build_directory, "MetaCoin.json")
    ).mtime;
    updateFile("MetaCoin.sol", config);
    await CommandRunner.run("truffle test", config);
    const newTimeModified = fse.statSync(
      path.join(config.contracts_build_directory, "MetaCoin.json")
    ).mtime;
    assert.notEqual(
      timeModified,
      newTimeModified,
      "the artifact wasn't updated"
    );
  });
});
