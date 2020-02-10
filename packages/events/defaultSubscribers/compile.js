const OS = require("os");

module.exports = {
  initialization: function() {
    this.logger = console;
  },
  handlers: {
    "compile:start": [
      function() {
        this.logger.log(OS.EOL + `Compiling your contracts...`);
        this.logger.log(`===========================`);
      }
    ],
    "compile:succeed": [
      function({ contractsBuildDirectory, compilersInfo }) {
        if (Object.keys(compilersInfo).length > 0) {
          this.logger.log(`> Artifacts written to ${contractsBuildDirectory}`);
          this.logger.log(`> Compiled successfully using:`);

          const maxLength = Object.keys(compilersInfo)
            .map(name => name.length)
            .reduce((max, length) => (length > max ? length : max), 0);

          for (const name in compilersInfo) {
            const padding = " ".repeat(maxLength - name.length);

            this.logger.log(
              `   - ${name}:${padding} ${compilersInfo[name].version}`
            );
          }
        }
        this.logger.log();
      }
    ],
    "compile:sourcesToCompile": [
      function({ sourceFileNames }) {
        if (!sourceFileNames) return;
        sourceFileNames.forEach(sourceFileName =>
          this.logger.log("> Compiling " + sourceFileName)
        );
      }
    ],
    "compile:warnings": [
      function({ warnings }) {
        this.logger.log("> Compilation warnings encountered:");
        this.logger.log(`${OS.EOL}    ${warnings.join()}`);
      }
    ],
    "compile:nothingToCompile": [
      function() {
        this.logger.log(
          `> Everything is up to date, there is nothing to compile.`
        );
      }
    ]
  }
};
