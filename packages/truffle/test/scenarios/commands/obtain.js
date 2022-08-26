const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const Config = require("@truffle/config");
const fse = require("fs-extra");
const path = require("path");
const assert = require("assert");
const sandbox = require("../sandbox");

let logger, config, project, compilersCacheDirectory;

describe("truffle obtain", function () {
  project = path.join(__dirname, "../../sources/obtain");

  beforeEach(async function () {
    compilersCacheDirectory = path.join(
      Config.getTruffleDataDirectory(),
      "compilers",
      "node_modules"
    );
    this.timeout(10000);
    config = await sandbox.create(project);
    logger = new MemoryLogger();
    config.logger = logger;

    // ensure the compiler is not cached beforehand
    if (fse.existsSync(compilersCacheDirectory)) {
      fse.removeSync(compilersCacheDirectory);
    }
  });

  afterEach(() => {
    if (fse.existsSync(compilersCacheDirectory)) {
      fse.removeSync(compilersCacheDirectory);
    }
  });

  it("fetches the solc version specified", async function () {
    this.timeout(70000);
    await CommandRunner.run("obtain --solc=0.7.2", config);
    const cachedCompilersFilenames = fse.readdirSync(compilersCacheDirectory);

    assert(
      cachedCompilersFilenames.some(filename => {
        return filename.includes("v0.7.2+commit.51b20bc0");
      }),
      "The compiler was not obtained!"
    );
  });

  it("respects the `quiet` option", async function () {
    this.timeout(80000);
    await CommandRunner.run("obtain --solc=0.7.2 --quiet", config);
    // logger.contents() returns false as long as nothing is written to the
    // stream that is used for logging in MemoryLogger
    // in Node12, Ganache prints a warning and it cannot be suppressed
    // I guess we have to allow it until we stop supporting Node12
    const ganacheNode12WarningRegex =
      /This\sversion\sof\sµWS.*?may\sbe\sdegraded\.\n\n\n/s;
    const removeGanacheWarning = text => {
      return text ? text.replace(ganacheNode12WarningRegex, "") : text;
    };

    const loggedStuff = removeGanacheWarning(logger.contents());
    assert(
      !loggedStuff,
      "The command logged to the console when it shouldn't have."
    );
  });
});
