const Contracts = require("../index");
const assert = require("assert");

let logger, config, options;

beforeEach(() => {
  logger = {
    log(stringToLog) {
      this.loggedStuff = this.loggedStuff + stringToLog;
    },
    loggedStuff: ""
  };
  options = {
    logger,
    quiet: false
  };
  config = {
    contracts_directory: "./sources",
    contracts_build_directory: "./build"
  };
});

describe("Contracts.reportCompilationStarted", () => {
  it("reports start of compilation when options.quiet false", () => {
    Contracts.reportCompilationStarted(options);
    assert(logger.loggedStuff.includes("Compiling your contracts"));
  });

  it("omits start of compilation when options.quiet set true", () => {
    options.quiet = true;
    Contracts.reportCompilationStarted(options);
    assert(logger.loggedStuff === "");
  });
});

describe("Contracts.reportNothingToCompile", () => {
  it("reports nothing to compile when options.quiet set false", () => {
    Contracts.reportNothingToCompile(options);
    assert(logger.loggedStuff.includes("nothing to compile"));
  });

  it("omits reporting when options.quiet set true", () => {
    options.quiet = true;
    Contracts.reportNothingToCompile(options);
    assert(logger.loggedStuff === "");
  });
});

describe("Contracts.reportCompilationFinished", () => {
  beforeEach(() => {
    config.compilersInfo = {};
  });

  it("reports artifacts written after successful compilation when options.quiet set false", () => {
    config.compilersInfo.solc = {}; // a compiler key is added after being used to compile
    Contracts.reportCompilationFinished(options, config);
    assert(logger.loggedStuff.includes("Artifacts written"));
  });

  it("reports nothing when nothing new compiled and options.quiet set false", () => {
    Contracts.reportCompilationFinished(options, config);
    assert(logger.loggedStuff === "undefined");
  });

  it("reports where contract build artifacts have been written after successful compilation (options.quiet = false)", () => {
    config.compilersInfo.solc = {}; // a compiler key is added after being used to compile
    options.contracts_build_directory = config.contracts_build_directory;
    Contracts.reportCompilationFinished(options, config);
    assert(logger.loggedStuff.includes(`${options.contracts_build_directory}`));
  });

  it("reports compiler used after successful compilation (options.quiet = false)", () => {
    config.compilersInfo.solc = { version: "0.5.0" };
    Contracts.reportCompilationFinished(options, config);
    assert(
      logger.loggedStuff.includes(`solc: ${config.compilersInfo.solc.version}`)
    );
  });

  it("reports multiple compilers used after successful compilation (options.quiet = false)", () => {
    config.compilersInfo.solc = { version: "0.5.0" };
    config.compilersInfo.vyper = { version: "0.1.0b9" };
    Contracts.reportCompilationFinished(options, config);
    assert(
      logger.loggedStuff.includes(`solc:  ${config.compilersInfo.solc.version}`)
    );
    assert(
      logger.loggedStuff.includes(
        `vyper: ${config.compilersInfo.vyper.version}`
      )
    );
  });

  it("omits reporting when options.quiet set true", () => {
    options.quiet = true;
    Contracts.reportCompilationFinished(options, config);
    assert(logger.loggedStuff === "");
  });
});
