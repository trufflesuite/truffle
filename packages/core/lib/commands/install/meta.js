module.exports = {
  command: "install",
  description:
    "[deprecated] Install a package from the Ethereum Package Registry",
  builder: {},
  help: {
    usage: "[deprecated] truffle install <package_name>[@<version>]",
    options: [
      {
        option: "package_name",
        description:
          "Name of the package as listed in the Ethereum Package Registry. (required)"
      },
      {
        option: "<@version>",
        description:
          "When specified, will install a specific version of the package, otherwise " +
          "will install\n                    the latest version."
      }
    ],
    allowedGlobalOptions: []
  }
};
