const OS = require("os");

module.exports = {
  initialization: function () {
    this.logger = console;
  },
  handlers: {
    "compile:start": [
      function () {
        this.logger.log(OS.EOL + `Compiling your contracts...`);
        this.logger.log(`===========================`);
      }
    ],
    "compile:succeed": [
      function ({ contractsBuildDirectory, compilers }) {
        if (compilers.length > 0) {
          this.logger.log(`> Artifacts written to ${contractsBuildDirectory}`);
          this.logger.log(`> Compiled successfully using:`);

          const versionReports = new Set();

          const maxLength = compilers
            .map(({ name }) => name.length)
            .reduce((max, length) => (length > max ? length : max), 0);

          for (const compiler of compilers) {
            const padding = " ".repeat(maxLength - compiler.name.length);
            const versionReport =
              `   - ${compiler.name}:${padding} ${compiler.version}`;

            if (!versionReports.has(versionReport)) {
              this.logger.log(versionReport);
              versionReports.add(versionReport);
            }
          }
        }
        this.logger.log();
      }
    ],
    "compile:sourcesToCompile": [
      function ({ sourceFileNames }) {
        if (!sourceFileNames) return;
        sourceFileNames.forEach(sourceFileName =>
          this.logger.log("> Compiling " + sourceFileName)
        );
      }
    ],
    "compile:warnings": [
      function ({ warnings }) {
        this.logger.log("> Compilation warnings encountered:");
        this.logger.log(`${OS.EOL}    ${warnings.join()}`);
      }
    ],
    "compile:nothingToCompile": [
      function () {
        this.logger.log(
          `> Everything is up to date, there is nothing to compile.`
        );
      }
    ]
  }
};
