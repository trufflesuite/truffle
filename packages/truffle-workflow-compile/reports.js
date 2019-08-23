const OS = require("os");

function reportCompilationStarted(options) {
  const logger = options.logger || console;
  if (!options.quiet) {
    logger.log(OS.EOL + `Compiling your contracts...`);
    logger.log(`===========================`);
  }
}

function reportCompilationFinished(options) {
  const logger = options.logger || console;
  const { compilersInfo } = options;
  if (!options.quiet) {
    if (Object.keys(compilersInfo).length > 0) {
      logger.log(`> Artifacts written to ${options.contracts_build_directory}`);
      logger.log(`> Compiled successfully using:`);

      const maxLength = Object.keys(compilersInfo)
        .map(name => name.length)
        .reduce((max, length) => (length > max ? length : max), 0);

      for (const name in compilersInfo) {
        const padding = " ".repeat(maxLength - name.length);

        logger.log(`   - ${name}:${padding} ${compilersInfo[name].version}`);
      }
    }
    logger.log();
  }
}

function reportNothingToCompile(options) {
  const logger = options.logger || console;
  if (!options.quiet) {
    logger.log(`> Everything is up to date, there is nothing to compile.`);
  }
}

module.exports = {
  reportCompilationStarted,
  reportCompilationFinished,
  reportNothingToCompile
};
