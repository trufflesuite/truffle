const {
  getCommand,
  prepareOptions,
  runCommand
} = require("../lib/command-utils");
const { validTruffleCommands } = require("../lib/commands/commands");
const allCommands = require("../lib/commands");
const { assert } = require("chai");

describe("commands", function () {
  describe("Truffle commands", function () {
    // these tests ensure that the command name array contains one command name
    // per command and vice versa so they don't get out of sync
    it("contains an array item for each command", function () {
      assert(
        Object.keys(allCommands).every(command =>
          validTruffleCommands.includes(command)
        )
      );
    });
    it("contains a command for every array item", function () {
      assert(
        validTruffleCommands.every(command =>
          Object.keys(allCommands).includes(command)
        )
      );
    });
  });

  describe("getCommand utility", function () {
    it("infers commands based on initial letters entered", function () {
      const result = getCommand({ inputStrings: ["m"] }).name;
      assert.equal(result, "migrate");
    });

    it("infers commands based on initial letters entered, even when typos exist later", function () {
      const result = getCommand({ inputStrings: ["complie"] }).name;
      assert.equal(result, "compile");
    });

    it("doesn't infer a command if not given enough information", function () {
      // Note: "co" matches "console" and "compile"
      const result = getCommand({ inputStrings: ["co"] });
      assert.isNull(result);
    });

    it("infers commands based on initial letters entered, given matches for shorter substrings", function () {
      // Note: "co" matches "console" and "compile"
      const result = getCommand({ inputStrings: ["com"] }).name;
      assert.equal(result, "compile");
    });

    it("ignores inferring if full command is specified", function () {
      const result = getCommand({ inputStrings: ["console"] }).name;
      assert.equal(result, "console");
    });

    it("warns and displays an error for unsupported flags in commands", async function () {
      const result = getCommand({
        inputStrings: ["mig"],
        options: { logger: console },
        noAliases: false
      });
      assert.equal(result.name, "migrate");

      const originalLog = console.log || console.debug;
      let warning = "";
      console.log = function (msg) {
        console.log = originalLog;
        warning = msg;
      };

      const inputStrings = [
        "migrate",
        "--network",
        "localhost",
        "--unsupportedflag",
        "invalidoption",
        "--unsupportedflag2",
        "invalidflag2"
      ];

      try {
        const options = prepareOptions({
          command: result,
          inputStrings,
          options: { logger: console }
        });
        await runCommand(result, options);
      } catch (error) {
        // this errors due to no config file but we don't care, we just want
        // to ensure it prints the unsupported option message
      } finally {
        assert(
          warning.includes(
            "> Warning: possible unsupported (undocumented in help) command line option(s): --unsupportedflag,--unsupportedflag2"
          )
        );
      }
    });
  });
});
