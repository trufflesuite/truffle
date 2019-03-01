const OS = require("os");
//
// module.exports = {
//   compiledSources(options, sources) {
//     if (!sources) return;
//     const logger = options.logger || console;
//     sources.forEach(source => logger.log("    > " + source));
//   },
//
//   finishJob(options, config) {
//     const { globalConfig } = options;
//     const { compilersInfo } = config;
//     const logger = options.logger || console;
//     if (Object.keys(compilersInfo).length > 0) {
//       logger.log(
//         `${OS.EOL}    > artifacts written to ${
//           globalConfig.contracts_build_directory
//         }`
//       );
//       logger.log(OS.EOL + `Compiled successfully using:` + OS.EOL);
//       for (const name in compilersInfo) {
//         logger.log(`    > ${name}: ${compilersInfo[name].version}`);
//       }
//     } else {
//       logger.log(OS.EOL + `Compilation successful`);
//     }
//     logger.log();
//   },
//
//   initializeListeners(options) {
//     const { emitter } = options;
//     emitter.on("compile:startJob", this.startJob.bind(this, options));
//     emitter.on("compile:finishJob", this.finishJob.bind(this, options));
//     emitter.on("compile:warnings", this.warnings.bind(this, options));
//     emitter.on(
//       "compile:compiledSources",
//       this.compiledSources.bind(this, options)
//     );
//     emitter.on(
//       "compile:nothingToCompile",
//       this.nothingToCompile.bind(this, options)
//     );
//   },
//
//   nothingToCompile(options) {
//     const logger = options.logger || console;
//     logger.log(
//       `Everything is up to date, there is nothing to compile.` + OS.EOL
//     );
//   },
//
//   startJob(options) {
//     const logger = options.logger || console;
//     logger.log(`${OS.EOL}Compiling your contracts${OS.EOL}`);
//   },
//
//   warnings(options, warnings) {
//     const logger = options.logger || console;
//     logger.log(colors.yellow("    > compilation warnings encountered:"));
//     logger.log(warnings.map(warning => warning.formattedMessage).join());
//   }
// };

module.exports = [
  {
    name: "compile",
    namespaces: [
      {
        name: "startJob",
        handlers: [
          function() {
            this.logger.log(`${OS.EOL}Compiling your contracts${OS.EOL}`);
          }
        ]
      },

      {
        name: "finishJob",
        handlers: [
          function({ globalConfig, compilersInfo }) {
            if (Object.keys(compilersInfo).length > 0) {
              this.logger.log(
                `${OS.EOL}    > artifacts written to ${
                  globalConfig.contracts_build_directory
                }`
              );
              this.logger.log(OS.EOL + `Compiled successfully using:` + OS.EOL);
              for (const name in compilersInfo) {
                this.logger.log(
                  `    > ${name}: ${compilersInfo[name].version}`
                );
              }
            } else {
              this.logger.log(OS.EOL + `Compilation successful`);
            }
            this.logger.log();
          }
        ]
      },

      {
        name: "compiledSources",
        handlers: [
          function(sources) {
            if (!sources) return;
            sources.forEach(source => this.logger.log("    > " + source));
          }
        ]
      },

      {
        name: "warnings",
        handlers: [
          function(options, warnings) {
            this.logger.log("    > compilation warnings encountered:");
            this.logger.log(
              warnings.map(warning => warning.formattedMessage).join()
            );
          }
        ]
      }
    ]
  }
];

//
// module.exports = [
//   {
//     "initialization": (options) => { ...do something with options... },
//
//     "name": "myNamespace",
//     "handlers": [ ...array of handlers for "myNamespace" event... ],
//
//     "namespace": {
//       "name": "subNamespace",
//       "handlers": [                // handlers for event "myNamespace:subNamespace"
//         (someData) => {
//           console.log(`the data after 'something' happened is ${someData.something}`);
//         },
//         (someOtherData) => {
//           ...do something else
//         },
//
//         "namespace": {
//           "name": "subSubNamespace",
//           "handlers": [            // handlers for event "myNamespace:subNamespace:subSubNamespace"
//             (andEvenMoreData) => console.log(andEvenMoreData)
//           ]
//         }
//       }
//     ]
//   }
// }
