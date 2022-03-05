const Artifactor = require("@truffle/artifactor");
const Config = require("@truffle/config");
const OS = require("os");
const Resolver = require("@truffle/resolver");
const TaskError = require("../../../lib/errors/taskerror");
const autocomplete = require("../../../lib/commands/autocomplete");
const chai = require("chai");
const { default: Box } = require("@truffle/box");
const fs = require("fs");
const path = require("path");
const sinon = require("sinon");

const assert = chai.assert;
chai.use(require("chai-as-promised"));

let config;
let mockConfigDir;
let mockHomeDir;

describe("autocomplete", () => {
  before("Create a sandbox", async () => {
    if (!process.env.SHELL) {
      process.env.SHELL = "";
    }

    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.networks = {
      default: {
        network_id: "1"
      },
      secondary: {
        network_id: "12345"
      }
    };
    config.network = "default";
    config.logger = { log: _ => {} };
  });

  beforeEach("Set up mock home directory", async () => {
    mockConfigDir = await fs.promises.mkdtemp("config-");
    mockHomeDir = await fs.promises.mkdtemp("home-");

    sinon.stub(Config, "getTruffleDataDirectory").returns(mockConfigDir);
    sinon.stub(OS, "homedir").returns(mockHomeDir);
  });

  afterEach("Restore mocks and clean out temp files", async () => {
    sinon.restore();
    await Promise.all([
      fs.promises.rmdir(mockConfigDir, { recursive: true }),
      fs.promises.rmdir(mockHomeDir, { recursive: true })
    ]);
  });

  it("throws exception if install or uninstall are not called", async () => {
    const options = { _: "" };
    assert.isRejected(autocomplete.run(config.with(options)), TaskError);
  });

  describe("autocomplete install", () => {
    async function testInstallInProfile(shellConfig) {
      const shell = (shellConfig.match(/\.(\w+)rc/) ||
        shellConfig.match(/\.(\w+)_profile/))[1];

      sinon.stub(process.env, "SHELL").value(shell);
      await fs.promises.writeFile(path.resolve(mockHomeDir, shellConfig), " ");

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));

      const fileContents = new TextDecoder().decode(
        await fs.promises.readFile(path.resolve(mockHomeDir, shellConfig))
      );

      assert.isTrue(
        fs.existsSync(path.resolve(mockConfigDir, `completion.${shell}`))
      );
      assert.include(fileContents, `completion.${shell}`);
    }

    it("implements bash completion", async () => {
      sinon.stub(process.env, "SHELL").value("bash");
      const localShare = await fs.promises.mkdir(
        path.resolve(mockHomeDir, ".local/share/"),
        { recursive: true }
      );

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));

      const fileContents = new TextDecoder().decode(
        await fs.promises.readFile(
          path.resolve(localShare, "share/bash-completion/completions/truffle")
        )
      );

      assert.include(fileContents, `_truffle_yargs_completions`);
    });

    it("adds a zsh completion script to truffle config directory", async () => {
      await testInstallInProfile(".zshrc");
    });

    it("loads zsh completion script from .zsh_profile", async () => {
      await testInstallInProfile(".zsh_profile");
    });

    it("can handle unknown shells", async () => {
      sinon.stub(process.env, "SHELL").value("fish");

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));

      // Test passes as long as it doesn't throw
    });

    it("can handle undefined SHELL", async () => {
      sinon.stub(process.env, "SHELL").value(undefined);

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));

      // Test passes as long as it doesn't throw
    });

    it("will not add a duplicate line to .zshrc", async () => {
      const shell = "zsh";
      sinon.stub(process.env, "SHELL").value(shell);
      await fs.promises.writeFile(
        path.resolve(mockHomeDir, `.${shell}rc`),
        " "
      );

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));
      await autocomplete.run(config.with(options));

      const fileContents = new TextDecoder().decode(
        await fs.promises.readFile(path.resolve(mockHomeDir, `.${shell}rc`))
      );

      const numMatches = [
        fileContents.matchAll(new RegExp(`completion.${shell}`, "g"))
      ].length;

      assert.equal(numMatches, 1);
    });
  });

  describe("autocomplete uninstall", () => {
    async function testUninstallFromConfig(shellConfig) {
      const shell = (shellConfig.match(/\.(\w+)rc/) ||
        shellConfig.match(/\.(\w+)_profile/))[1];

      sinon.stub(process.env, "SHELL").value(shell);
      await fs.promises.writeFile(path.resolve(mockHomeDir, shellConfig), " ");
      await autocomplete.run(config.with({ _: ["install"] }));
      await autocomplete.run(config.with({ _: ["uninstall"] }));

      assert.isFalse(
        fs.existsSync(path.resolve(mockConfigDir, `completion.${shell}`))
      );
      const fileContents = new TextDecoder().decode(
        await fs.promises.readFile(path.resolve(mockHomeDir, shellConfig))
      );

      assert.notInclude(fileContents, `completion.${shell}`);
    }

    it("uninstalls bash completion", async () => {
      sinon.stub(process.env, "SHELL").value("bash");
      const localShare = await fs.promises.mkdir(
        path.resolve(mockHomeDir, ".local/share"),
        { recursive: true }
      );

      await autocomplete.run(config.with({ _: ["install"] }));
      await autocomplete.run(config.with({ _: ["uninstall"] }));

      assert.isFalse(
        fs.existsSync(
          path.resolve(localShare, "share/bash-completion/completions/truffle")
        )
      );
    });

    it("uninstalls from .zshrc", async () => {
      await testUninstallFromConfig(".zshrc");
    });

    it("uninstalls from .zsh_profile", async () => {
      await testUninstallFromConfig(".zsh_profile");
    });

    it("can handle unknown shells", async () => {
      sinon.stub(process.env, "SHELL").value("fish");

      const options = { _: ["uninstall"] };
      await autocomplete.run(config.with(options));

      // Test passes as long as it doesn't throw
    });
  });
});
