module.exports = async function (options) {
  const OS = require("os");
  const colors = require("colors");
  const deprecationMessage = colors.yellow(
    `> The build command is planned ` +
      `for deprecation in version 6 of Truffle.${OS.EOL}> See ` +
      `https://github.com/trufflesuite/truffle/issues/3226 for more ` +
      `information.`
  );
  console.log(deprecationMessage);
  const Config = require("@truffle/config");
  const Build = require("../../build");
  const config = Config.detect(options);

  return await Build.build(config);
};
