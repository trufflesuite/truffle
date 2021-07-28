module.exports = {
  command: "obtain",
  description: "Fetch and cache a specified compiler",
  help: {
    usage: "truffle obtain [--solc <version>]",
    options: [
      {
        option: "--solc <version>",
        description: `Download and cache a version of the solc compiler. (required)`
      }
    ],
    allowedGlobalOptions: []
  },
  run: async function (options) {
    const SUPPORTED_COMPILERS = ["--solc"];
    const Config = require("@truffle/config");
    const config = Config.default().with(options);

    config.events.emit("obtain:start");

    if (options.solc) {
      return await this.downloadAndCacheSolc({config, options});
    }

    const message =
      `You have specified a compiler that is unsupported by ` +
      `Truffle.\nYou must specify one of the following ` +
      `compilers as well as a version as arguments: ` +
      `${SUPPORTED_COMPILERS.join(", ")}\nSee 'truffle help ` +
      `obtain' for more information and usage.`;
    throw new Error(message);
  },

  downloadAndCacheSolc: async ({config, options}) => {
    const { CompilerSupplier } = require("@truffle/compile-solidity");
    const semver = require("semver");
    const { events } = config;

    const version = options.solc;
    if (!version || !semver.validRange(version)) {
      const message =
        `You must specify a valid solc version to download` +
        `You specified: "${version}".`;
      throw new Error(message);
    }

    try {
      const supplier = new CompilerSupplier({
        events,
        solcConfig: {
          ...config.compilers.solc,
          version
        }
      });
      const { solc } = await supplier.load();
      events.emit("obtain:succeed", {
        compiler: {
          version: solc.version(),
          name: "Solidity"
        }
      });
      return;
    } catch (error) {
      events.emit("obtain:fail");
      return;
    }
  }
};
