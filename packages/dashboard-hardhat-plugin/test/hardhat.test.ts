import { assert, expect } from "chai";
import { it, describe, before, after } from "mocha";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { HardhatError } from "hardhat/internal/core/errors";
import // IncompatibleHardhatBuildInfoFormatError,
// IncompatibleHardhatVersionError
"@truffle/from-hardhat";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { useEnvironment } from "./helpers";
import fs from "fs";
import path from "path";

describe("Truffle dashboard hardhat plugin compilation tests", function () {
  before(async function () {
    this.timeout(1000000);
  });

  after(async function () {
    resetHardhatContext();
  });

  describe("Compiling with incompatible hardhat build info", function () {
    useEnvironment("hardhat-project-incompatible", "dashboard");

    it("should fail when incompatible hardhat build info (e.g. hh-sol-build-info-2) is detected", async function () {
      this.timeout(20000);
      await this.env.run(TASK_COMPILE, {
        force: false,
        quiet: false,
        config: "hardhat.config.no.plugin.ts"
      });

      const buildInfoFiles = fs.readdirSync(
        path.join(
          __dirname,
          "fixture-projects",
          "hardhat-project-incompatible",
          "artifacts",
          "build-info"
        )
      );

      const buildInfo = JSON.parse(
        fs.readFileSync(
          path.join(
            __dirname,
            "fixture-projects",
            "hardhat-project-incompatible",
            "artifacts",
            "build-info",
            buildInfoFiles[0]
          ),
          "utf8"
        )
      );

      buildInfo._format = "hh-sol-build-info-2";

      fs.writeFileSync(
        path.join(
          __dirname,
          "fixture-projects",
          "hardhat-project-incompatible",
          "artifacts",
          "build-info",
          buildInfoFiles[0]
        ),
        JSON.stringify(buildInfo),
        "utf8"
      );

      return await this.env
        .run(TASK_COMPILE, { force: false, quiet: true })
        .then(() => {
          assert.fail("Compilation should fail.");
        })
        .catch(reason => {
          // ideally should be checking for IncompatibleHardhatBuildInfoFormatError
          // although there appear to be known issues with chai when subclassing built-in object (such as Error)
          expect(reason).to.be.an.instanceOf(
            Error,
            'Error: Expected build-info to be one of ["hh-sol-build-info-1"], got: "hh-sol-build-info-2"'
          );
        });
    });
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
