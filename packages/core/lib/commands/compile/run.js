const path = require("path");
const fse = require("fs-extra");

module.exports = async function (options) {
  const { TruffleError } = require("@truffle/error");
  const WorkflowCompile = require("@truffle/workflow-compile");
  const Config = require("@truffle/config");
  const config = Config.detect(options);

  if (config.list !== undefined) {
    return await listVersions(config);
  }

  if (
    options.saveIntermediate === true ||
    (typeof options.saveIntermediate === "string" &&
      options.saveIntermediate.trim() === "")
  ) {
    // user asked to save the intermediate compilation results
    // but didn't provide the file to save the results to
    throw new TruffleError(
      "You must provide a file to save compilation results to."
    );
  }

  if (config._ && config._.length > 0) {
    // set paths based on command-line inputs, transforming to absolute
    // paths where appropriate
    config.paths = config._.map(specifiedPath => {
      // convert relative paths to absolute paths based on whether
      // the naive absolute path exists on disk
      //
      // NOTE in case of collision where the specified path refers to some
      // non-FS source (e.g. `truffle/Assert.sol`) and where that specified
      // path corresponds to an existing file relative to the working dir.,
      // this selects the latter as priority over the former.

      const absolutePath = path.resolve(
        config.working_directory,
        specifiedPath
      );

      // i.e., pass the absolutePath if it's a real file, otherwise just
      // pass whatever was specified.
      if (fse.existsSync(absolutePath)) {
        return absolutePath;
      } else {
        return specifiedPath;
      }
    });
  }

  const compilationOutput = await WorkflowCompile.compile(config);
  if (options.saveIntermediate) {
    // Get the filename the user provided to save the compilation results to
    const compilationOutputFile = path.resolve(options.saveIntermediate);

    await fse.writeFile(
      compilationOutputFile,
      JSON.stringify(compilationOutput),
      { encoding: "utf8" }
    );
  }

  const result = await WorkflowCompile.save(config, compilationOutput);
  if (config.db && config.db.enabled) {
    await WorkflowCompile.assignNames(config, result);
  }
};

const listVersions = async function (options) {
  const { CompilerSupplier } = require("@truffle/compile-solidity");
  const { asyncTake } = require("iter-tools");

  const supplier = new CompilerSupplier({
    solcConfig: {
      ...options.compilers.solc,
      // HACK to force use of the VersionRange or Docker strategy
      // as implemented, Docker requires a version to be specified, and so
      // we can't simply remove this field entirely.
      version: "0.5.16",
      docker: options.list === "docker"
    },
    events: options.events
  });

  const log = options.logger.log;
  options.list = options.list.length ? options.list : "releases";

  const { latestRelease, releases, prereleases } = await supplier.list();
  if (options.list === "latestRelease") {
    log(JSON.stringify(latestRelease, null, " "));
    return;
  }

  const allVersions = options.list === "prereleases" ? prereleases : releases;
  const versions = options.all ? allVersions : asyncTake(10, allVersions);

  if (options.all && options.list === "docker") {
    log(
      "Warning: using `--all` with `--list=docker` is very slow and makes " +
        "many HTTP requests."
    );
    log(
      "You may instead want to browse tags on the web here: " +
        "https://hub.docker.com/r/ethereum/solc/tags/"
    );
  }

  const tags = [];
  // use `for await` because Docker strategy returns AsyncIterableIterators
  for await (const version of versions) {
    tags.push(version);
  }

  // Docker tags are best browsed via their own web UI
  if (options.list === "docker" && !options.all) {
    tags.push("See more at: hub.docker.com/r/ethereum/solc/tags/");
  }

  log(JSON.stringify(tags, null, " "));
  return;
};
