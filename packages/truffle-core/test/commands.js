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

  it("will warn and display error for unsupported flags in commands", function() {
    var actualCommand = commander.getCommand("mig").command;
    assert.equal(actualCommand, commands.migrate);

    const originalLog = console.log || console.debug;
    let warning = "";
    console.log = function(msg) {
      console.log = originalLog;
      warning = msg;
    };

    commander.run(
      [
        "migrate",
        "--network",
        "localhost",
        "--unsupportedflag",
        "invalidoption",
        "--unsupportedflag2",
        "invalidflag2"
      ],
      { noAliases: true, logger: console },
      function() {
        //ignore. not part of test
      }
    );

    assert.equal(
      warning,
      "> Warning: possible unsupported (undocumented in help) command line option: --unsupportedflag,--unsupportedflag2"
    );
  });
});
