import { expect } from "chai";
import { it, describe, before, after } from "mocha";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { HardhatError } from "hardhat/internal/core/errors";
import // IncompatibleHardhatBuildInfoFormatError,
// IncompatibleHardhatVersionError
"@truffle/from-hardhat";
import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

describe("Truffle dashboard hardhat plugin compilation tests", function () {
  before(async function () {
    this.timeout(1000000);
  });

  after(async function () {
    resetHardhatContext();
  });

  describe("Compiling when no valid Hardhat project", function () {
    // manually loading the environment (below) to allow for the error thrown by the requiring of hh to be caught

    it("should fail when attempting to compile", async function () {
      try {
        process.chdir(
          path.join(__dirname, "fixture-projects", "hardhat-project-empty")
        );
        this.env = require("hardhat");
        await this.env.run(TASK_COMPILE, { force: false, quiet: true });
      } catch (reason) {
        expect(reason).to.be.an.instanceOf(
          HardhatError,
          "HardhatError: HH1: You are not inside a Hardhat project."
        );
      }
    });
  });
});
