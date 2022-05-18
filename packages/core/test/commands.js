const { getCommand, runCommand } = require("../lib/command-utils");
const { assert } = require("chai");

describe.only("Commander", function () {
  it("infers commands based on initial letters entered", function () {
    const result = getCommand(["m"]).name;
    assert.equal(result, "migrate");
  });

  it("infers commands based on initial letters entered, even when typos exist later", function () {
    const result = getCommand(["complie"]).name;
    assert.equal(result, "compile");
  });

  it("doesn't infer a command if not given enough information", function () {
    // Note: "co" matches "console" and "compile"
    assert.throws(() => getCommand(["co"]));
  });

  it("infers commands based on initial letters entered, given matches for shorter substrings", function () {
    // Note: "co" matches "console" and "compile"
    const result = getCommand(["com"]).name;
    assert.equal(result, "compile");
  });

  it("ignores inferring if full command is specified", function () {
    const result = getCommand(["console"]).name;
    assert.equal(result, "console");
  });

  it("warns and displays an error for unsupported flags in commands", async function () {
    const result = getCommand(["mig"], {});
    assert.equal(result.name, "migrate");

    const originalLog = console.log || console.debug;
    let warning = "";
    console.log = function (msg) {
      console.log = originalLog;
      warning = msg;
    };

    const inputs = [
      "migrate",
      "--network",
      "localhost",
      "--unsupportedflag",
      "invalidoption",
      "--unsupportedflag2",
      "invalidflag2"
    ];

    try {
      await runCommand(result, inputs, { logger: console });
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
