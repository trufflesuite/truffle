const normalizeDestination = (destination, workingDirectory) => {
  if (!destination) {
    return workingDirectory;
  }
  const path = require("path");
  if (path.isAbsolute(destination)) return destination;
  return path.join(workingDirectory, destination);
};

module.exports = async options => {
  const Config = require("@truffle/config");
  const { default: Box } = require("@truffle/box");
  const fse = require("fs-extra");

  const config = Config.default().with({ logger: console });
  // we merge in the options so that options passed on the command line
  // (for example --quiet) make it to the EventManager
  config.merge(options);

  let [url, destination] = options._;

  const normalizedDestination = normalizeDestination(
    destination,
    config.working_directory
  );

  fse.ensureDirSync(normalizedDestination);

  const unboxOptions = Object.assign({}, options, { logger: config.logger });

  config.events.emit("unbox:start");

  const boxConfig = await Box.unbox(
    url,
    normalizedDestination,
    unboxOptions,
    config
  );
  await config.events.emit("unbox:succeed", { boxConfig });
};
