const CommandRunner = require("../commandRunner");
const Server = require("../server");
const sandbox = require("../sandbox");
const path = require("path");

describe("truffle migrate", () => {
  let config, projectPath;

  before("before all setup", done => {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    sandbox
      .create(projectPath)
      .then(conf => {
        config = conf;
        config.network = "development";
        config.logger = { log: () => {} };
        config.workingDirectory = conf.working_directory;
      })
      .then(() => Server.start(done));
  });

  after(done => Server.stop(done));

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", async () => {
      await CommandRunner.run("migrate", config);
    }).timeout(20000);
  });
});
