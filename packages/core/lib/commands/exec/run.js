module.exports = async function (options) {
  const WorkflowCompile = require("@truffle/workflow-compile").default;
  const ConfigurationError = require("../../errors/configurationerror");
  const exec = require("@truffle/require").exec;
  const { Environment } = require("@truffle/environment");
  const path = require("path");
  const OS = require("os");
  const { promisify } = require("util");
  const loadConfig = require("../../loadConfig");
  const TruffleError = require("@truffle/error");

  if (options.url && options.network) {
    const message =
      "" +
      "Mutually exclusive options, --url and --network detected!" +
      OS.EOL +
      "Please use either --url or --network and try again." +
      OS.EOL +
      "See: https://trufflesuite.com/docs/truffle/reference/truffle-commands/#exec" +
      OS.EOL;
    throw new TruffleError(message);
  }

  const config = loadConfig(options);

  let file = options.file;

  if (file == null && options._.length > 0) {
    file = options._[0];
  }

  if (file == null) {
    throw new ConfigurationError(
      "Please specify a file, passing the path of the script you'd like the run. Note that all scripts *must* call process.exit() when finished."
    );
  }

  if (path.isAbsolute(file) === false) {
    file = path.join(process.cwd(), file);
  }

  await Environment.detect(config);
  if (config.networkHint !== false) {
    config.logger.log("Using network '" + config.network + "'." + OS.EOL);
  }

  // `--compile`
  let compilationOutput;
  if (options.c || options.compile) {
    compilationOutput = await WorkflowCompile.compile(config);
  }
  // save artifacts if compilation took place
  if (compilationOutput) {
    await WorkflowCompile.save(config, compilationOutput);
  }
  return await promisify(exec)(config.with({ file }));
};
