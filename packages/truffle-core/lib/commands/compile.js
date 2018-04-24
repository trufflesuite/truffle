var format = JSON.stringify;

var command = {
  command: 'compile',
  description: 'Compile contract source files',
  builder: {
    all: {
      type: "boolean",
      default: false
    },
    list: {
      type: "string",
    },
    help: {
      type: "boolean",
      default: "false"
    }
  },

  run: function (options, done) {
    var Config = require("truffle-config");
    var Contracts = require("truffle-workflow-compile");
    var CompilerProvider = require("truffle-compile").CompilerProvider;
    var provider = new CompilerProvider();

    var config = Config.detect(options);

    (config.list !== undefined)
      ? command.listVersions(provider, config, done)
      : Contracts.compile(config, done);
  },

  listVersions: function(provider, options, done){
    const log = options.logger.log;

    // Help
    if (options.list && options.help){
      log(command.help);
      return done();
    }

    // Docker tags
    if (options.list === 'docker'){
      return provider
        .getDockerTags()
        .then(tags => {
          tags.push('See more at: hub.docker.com/r/ethereum/solc/tags/')
          log(format(tags));
          done();
        })
        .catch(done);
    }

    // Solcjs releases
    provider
      .getReleases()
      .then(releases => {
        const shortener = options.all ? null : command.shortener;
        const list = format(releases[options.list], shortener, ' ');
        log(list);
        done();
      })
      .catch(done);
  },

  shortener: function(key, val){
    const defaultLength = 10;

    if (Array.isArray(val) && val.length > defaultLength){
      const length = val.length;
      const remaining = length - defaultLength;
      const more = '.. and ' + remaining + ' more. Use `--all` to see full list.';
      val.length = defaultLength;
      val.push(more);
    }

    return val;
  },

  help: "--list [option]: See available solc versions. " +
        "(Default: solcjs stable releases)\n" +
        "Options:\n" +
        " `docker`         recently published docker tags\n" +
        " `prereleases`    solcjs nightly builds\n" +
        " `latestRelease`  solcjs latest\n\n",
}

module.exports = command;
