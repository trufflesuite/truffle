const OS = require("os");

module.exports = {
  handlers: {
    "compile:startJob": function() {
      this.logger.log(OS.EOL + `Compiling your contracts...`);
      this.logger.log(`===========================`);
    },
    "compile:finishJob": function({ globalConfig, compilersInfo }) {
      if (Object.keys(compilersInfo).length > 0) {
        this.logger.log(
          `> Artifacts written to ${globalConfig.contracts_build_directory}`
        );
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
    },
    "compile:compiledSources": function({ sources }) {
      if (!sources) return;
      sources.forEach(source => this.logger.log("> Compiling " + source));
    },
    "compile:warnings": function({ warnings }) {
      this.logger.log("> Compilation warnings encountered:");
      this.logger.log(warnings.map(warning => warning.formattedMessage).join());
    },
    "compile:nothingToCompile": function() {
      this.logger.log(
        `> Everything is up to date, there is nothing to compile.`
      );
    }
  }
};
