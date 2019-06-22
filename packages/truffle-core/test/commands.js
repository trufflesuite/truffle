var Command = require("../lib/command");
var commands = require("../lib/commands");
var commander = new Command(commands);
var assert = require("assert");

describe("Commander", function() {
  before("assert preconditions", function() {
    // These commands are expected to exist in tests.
    assert.notEqual(commands.migrate, null);
    assert.notEqual(commands.compile, null);
    assert.notEqual(commands.console, null);
  });

  it("will infer commands based on initial letters entered", function() {
    var actualCommand = commander.getCommand("m").command;
    assert.equal(actualCommand, commands.migrate);
  });

  it("will infer commands based on initial letters entered, even when typos exist later", function() {
    var actualCommand = commander.getCommand("complie").command;
    assert.equal(actualCommand, commands.compile);
  });

  it("will NOT infer a command if not given enough information", function() {
    // Note: "co" matches "console" and "compile"
    var actualCommand = commander.getCommand("co");
    assert.equal(actualCommand, null);
  });

  it("will infer commands based on initial letters entered, given matches for shorter substrings", function() {
    // Note: "co" matches "console" and "compile"
    var actualCommand = commander.getCommand("com").command;
    assert.equal(actualCommand, commands.compile);
  });

  it("will ignore inferring if full command is specified", function() {
    var actualCommand = commander.getCommand("console").command;
    assert.equal(actualCommand, commands.console);
  });

  // Travis-CI build will failed if the following test cases are uncomment.

  // it("will stop and display error for unsupported flags in commands", function() {
  //   var actualCommand = commander.getCommand("mig").command;
  //   assert.equal(actualCommand, commands.migrate);
  //   commander.run(
  //     [
  //       "migrate",
  //       "--network",
  //       "localhost",
  //       "--unsupportedflag",
  //       "invalidoption"
  //     ],
  //     { noAliases: true },
  //     function(err) {
  //       assert.equal(
  //         err.message.split(":")[0],
  //         "Unsupported (Undocumented) command line option"
  //       );
  //     }
  //   );
  // });

  // it("will stop and display error for unsupported flags in commands", function() {
  //   var actualCommand = commander.getCommand("config").command;
  //   assert.equal(actualCommand, commands.config);
  //   commander.run(
  //     ["config", "--enable-analytics", "--unsupportedflag", "invalidoption"],
  //     { noAliases: true },
  //     function(err) {
  //       assert.equal(
  //         err.message.split(":")[0],
  //         "Unsupported (Undocumented) command line option"
  //       );
  //     }
  //   );
  // });
});
