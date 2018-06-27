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
    var CompilerSupplier = require("truffle-compile").CompilerSupplier;
    var supplier = new CompilerSupplier();

    var config = Config.detect(options);

    (config.list !== undefined)
      ? command.listVersions(supplier, config, done)
      : Contracts.compile(config, done);
  },

  listVersions: function(supplier, options, done){
    const log = options.logger.log;
    options.list = (options.list.length) ? options.list : "releases";

    // Help
    if (options.list && options.help){
      log(command.help);
      return done();
    }

    // Docker tags
    if (options.list === 'docker'){
      return supplier
        .getDockerTags()
        .then(tags => {
          tags.push('See more at: hub.docker.com/r/ethereum/solc/tags/')
          log(format(tags, null, ' '));
          done();
        })
        .catch(done);
    }

    // Solcjs releases
    supplier
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

  help: "\n" +
        "See available solc versions. (Default: solcjs stable releases)\n\n" +

        "USAGE:\n" +
        "   --list [option] [--all]\n\n" +

        "OPTIONS:\n" +
        " `docker`         recently published docker tags\n" +
        " `releases`       solcjs stable releases\n" +
        " `prereleases`    solcjs nightly builds\n" +
        " `latestRelease`  solcjs latest\n\n",
}

module.exports = command;
