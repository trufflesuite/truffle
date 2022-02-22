const OS = require("os");

module.exports = {
  initialization: function () {
    this.logger = console;
  },
  handlers: {
    "compile:start": [
      function () {
        if (this.quiet) return;
        this.logger.log(OS.EOL + `Compiling your contracts...`);
        this.logger.log(`===========================`);
      }
    ],
    "compile:succeed": [
      function ({ contractsBuildDirectory, compilers }) {
        if (this.quiet) return;
        if (compilers.length > 0) {
          this.logger.log(`> Artifacts written to ${contractsBuildDirectory}`);
          this.logger.log(`> Compiled successfully using:`);

          const versionReports = new Set();

          const maxLength = compilers
            .map(({ name }) => name.length)
            .reduce((max, length) => (length > max ? length : max), 0);

          for (const compiler of compilers) {
            const padding = " ".repeat(maxLength - compiler.name.length);
            const versionReport = `   - ${compiler.name}:${padding} ${compiler.version}`;

            if (!versionReports.has(versionReport)) {
              this.logger.log(versionReport);
              versionReports.add(versionReport);
            }
          }
        }
      }
    ],
    "compile:sourcesToCompile": [
      function ({ sourceFileNames }) {
        if (this.quiet) return;
        if (!sourceFileNames) return;
        sourceFileNames.forEach(sourceFileName =>
          this.logger.log("> Compiling " + sourceFileName)
        );
      }
    ],
    "compile:warnings": [
      function ({ warnings }) {
        if (this.quiet) return;
        this.logger.log("> Compilation warnings encountered:");
        this.logger.log(`${OS.EOL}    ${warnings.join()}`);
      }
    ],
    "compile:infos": [
      function ({ infos }) {
        if (this.quiet) return;
        this.logger.log("> Compilation notices encountered:");
        this.logger.log(`${OS.EOL}    ${infos.join()}`);
      }
    ],
    "compile:nothingToCompile": [
      function () {
        if (this.quiet) return;
        this.logger.log(
          `> Everything is up to date, there is nothing to compile.`
        );
      }
    ],
    "compile:skipped": [
      function () {
        if (this.quiet) return;
        this.logger.log(
          `> Compilation skipped because --compile-none option was passed.`
        );
      }
    ]
  }
};
