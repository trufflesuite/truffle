const CommandRunner = require("../commandrunner");
const sandbox = require("../sandbox");
const Server = require("../server");
const path = require("path");

describe("truffle deploy (alias for migrate)", () => {
  let config, projectPath;

  before("before all setup", done => {
    projectPath = path.join(__dirname, "../../sources/migrations/init");
    sandbox
      .create(projectPath)
      .then(conf => {
        config = conf;
        config.network = "development";
        config.logger = { log: () => {} };
      })
      .then(() => Server.start(done));
  });

  after(done => Server.stop(done));

  describe("when run on the most basic truffle project", () => {
    it("doesn't throw", async () => {
      await CommandRunner.run("deploy", config);
    }).timeout(20000);
  });
});
