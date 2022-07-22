module.exports = async function (options) {
  const Config = require("@truffle/config");
  const WorkflowCompile = require("@truffle/workflow-compile");
  const ConfigurationError = require("../../errors/configurationerror");
  const exec = require("@truffle/require").exec;
  const { Environment } = require("@truffle/environment");
  const path = require("path");
  const OS = require("os");
  const { promisify } = require("util");

  const config = Config.detect(options);

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
