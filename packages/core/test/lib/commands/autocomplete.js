const Artifactor = require("@truffle/artifactor");
const Config = require("@truffle/config");
const OS = require("os");
const Resolver = require("@truffle/resolver");
const TaskError = require("../../../lib/errors/taskerror");
const autocomplete = require("../../../lib/commands/autocomplete");
const chai = require("chai");
const { default: Box } = require("@truffle/box");
const fs = require("fs");
const fsPromises = require("fs/promises");
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
    mockConfigDir = await fsPromises.mkdtemp("config-");
    mockHomeDir = await fsPromises.mkdtemp("home-");

    sinon.stub(Config, "getTruffleDataDirectory").returns(mockConfigDir);
    sinon.stub(OS, "homedir").returns(mockHomeDir);
  });

  afterEach("Restore mocks and clean out temp files", async () => {
    sinon.restore();
    await Promise.all([
      fsPromises.rm(mockConfigDir, { force: true, recursive: true }),
      fsPromises.rm(mockHomeDir, { force: true, recursive: true })
    ]);
  });

  it("throws exception if install or uninstall are not called", async () => {
    const options = { _: "" };
    assert.isRejected(autocomplete.run(config.with(options)), TaskError);
  });

  describe("autocomplete install", () => {
    async function testAutocompleteInstall(shellConfig) {
      const shell = (shellConfig.match(/\.(\w+)rc/) ||
        shellConfig.match(/\.(\w+)_profile/))[1];

      sinon.stub(process.env, "SHELL").value(shell);
      await fsPromises.writeFile(path.resolve(mockHomeDir, shellConfig), " ");

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));

      const fileContents = new TextDecoder().decode(
        await fsPromises.readFile(path.resolve(mockHomeDir, shellConfig))
      );

      assert.isTrue(
        fs.existsSync(path.resolve(mockConfigDir, `completion.${shell}`))
      );
      assert.include(fileContents, `completion.${shell}`);
    }

    it("adds a bash completion script to truffle config directory", async () => {
      await testAutocompleteInstall(".bashrc");
    });

    it("loads bash completion script from .bash_profile", async () => {
      await testAutocompleteInstall(".bash_profile");
    });

    it("adds a zsh completion script to truffle config directory", async () => {
      await testAutocompleteInstall(".zshrc");
    });

    it("loads zsh completion script from .zsh_profile", async () => {
      await testAutocompleteInstall(".zsh_profile");
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

    it("will not add a duplicate line to .bashrc", async () => {
      const shell = "bash";
      sinon.stub(process.env, "SHELL").value(shell);
      await fsPromises.writeFile(path.resolve(mockHomeDir, `.${shell}rc`), " ");

      const options = { _: ["install"] };
      await autocomplete.run(config.with(options));
      await autocomplete.run(config.with(options));

      const fileContents = new TextDecoder().decode(
        await fsPromises.readFile(path.resolve(mockHomeDir, `.${shell}rc`))
      );

      const numMatches = [
        fileContents.matchAll(new RegExp(`completion.${shell}`, "g"))
      ].length;

      assert.equal(numMatches, 1);
    });
  });

  describe("autocomplete uninstall", () => {
    async function testAutocompleteUninstall(shellConfig) {
      const shell = (shellConfig.match(/\.(\w+)rc/) ||
        shellConfig.match(/\.(\w+)_profile/))[1];

      sinon.stub(process.env, "SHELL").value(shell);
      await fsPromises.writeFile(path.resolve(mockHomeDir, shellConfig), " ");
      await autocomplete.run(config.with({ _: ["install"] }));
      await autocomplete.run(config.with({ _: ["uninstall"] }));

      assert.isFalse(
        fs.existsSync(path.resolve(mockConfigDir, `completion.${shell}`))
      );
      const fileContents = new TextDecoder().decode(
        await fsPromises.readFile(path.resolve(mockHomeDir, shellConfig))
      );

      assert.notInclude(fileContents, `completion.${shell}`);
    }

    it("uninstalls from .bashrc", async () => {
      await testAutocompleteUninstall(".bashrc");
    });

    it("uninstalls from .bash_profile", async () => {
      await testAutocompleteUninstall(".bash_profile");
    });

    it("uninstalls from .zshrc", async () => {
      await testAutocompleteUninstall(".zshrc");
    });

    it("uninstalls from .zsh_profile", async () => {
      await testAutocompleteUninstall(".zsh_profile");
    });

    it("can handle unknown shells", async () => {
      sinon.stub(process.env, "SHELL").value("fish");

      const options = { _: ["uninstall"] };
      await autocomplete.run(config.with(options));

      // Test passes as long as it doesn't throw
    });
  });
});
