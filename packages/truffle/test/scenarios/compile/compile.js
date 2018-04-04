var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");
var sandbox = require("../sandbox");
var log = console.log;

describe("Repeated compilation of contracts with inheritance", function() {
  var config;
  var contracts;
  var contractPaths;
  var artifactPaths;
  var initialTimes;
  var finalTimes;
  var output;
  var mapping = {};

  var project = path.join(__dirname, '../../sources/inheritance');
  var names = ["Root", "Branch", "LeafA", "LeafB", "LeafC", "SameFile1", "SameFile2", "LibraryA"];
  var logger = new MemoryLogger();

  // ----------------------- Utils -----------------------------
  function processErr(err, output){
    if (err){
      log(output);
      throw new Error(err);
    }
  }

  function waitSecond() {
    return new Promise((resolve, reject) => setTimeout(() => resolve(), 1250));
  }

  function getContract(key) {
    return fs.readFileSync(mapping[key].contractPath);
  }

  function getArtifact(key) {
    return fs.readFileSync(mapping[key].artifactPath);
  }

  function getArtifactStats() {
    const stats = {};
    names.forEach(key => {
      const mDate = fs.statSync(mapping[key].artifactPath).mtime.getTime();
      stats[key] = mDate;
    });
    return stats;
  }

  function touchContract(key, file) {
    fs.writeFileSync(mapping[key].contractPath, file);
  }

  // ----------------------- Setup -----------------------------

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  beforeEach("set up sandbox and do initial compile", function(done) {
    this.timeout(10000);

    sandbox.create(project).then(conf => {
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger),
      }

      contracts = names.map(name => name + '.sol');
      artifactPaths = names.map(name => path.join(config.contracts_build_directory, name + '.json'));
      contractPaths = contracts.map(contract => path.join(config.contracts_directory, contract));

      names.forEach((name, i) => {
        mapping[name] = {};
        mapping[name].contract = contracts[i];
        mapping[name].artifactPath = artifactPaths[i];
        mapping[name].contractPath = contractPaths[i];
      })

      CommandRunner.run("compile", config, function(err) {
        output = logger.contents();
        processErr(err, output);

        initialTimes = getArtifactStats();

        // mTime resolution on 6.9.1 is 1 sec.
        waitSecond().then(done);
      })
    });
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA         LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch -           - LeafC   |    SameFile2
  //                 \       /            |
  //                   LeafB              |
  // ------------------------------------------------------------

  it("Updates only Root when Root is touched", function(done) {
    this.timeout(30000);

    touchContract('Root', getContract('Root'));

    CommandRunner.run("compile", config, function(err) {
      output = logger.contents();
      processErr(err, output);

      finalTimes = getArtifactStats();

      try {
        assert(initialTimes['Root'] < finalTimes['Root'], 'Should update root');
        assert(initialTimes['Branch'] === finalTimes['Branch'], 'Should not update Branch');
        assert(initialTimes['LeafA'] === finalTimes['LeafA'], 'Should not update LeafA');
        assert(initialTimes['LeafB'] === finalTimes['LeafB'], 'Should not update LeafB');
        assert(initialTimes['LeafC'] === finalTimes['LeafC'], 'Should not update LeafC');
        assert(initialTimes['LibraryA'] === finalTimes['LibraryA'], 'Should not update LibraryA');
        assert(initialTimes['SameFile1'] === finalTimes['SameFile1'], 'Should not update SameFile1');
        assert(initialTimes['SameFile2'] === finalTimes['SameFile2'], 'Should not update SameFile2');
        done();
      } catch(err) {
        err.message += '\n\n' + output;
        throw new Error(err);
      }
    });
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA*        LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch -           - LeafC   |    SameFile2
  //                 \       /            |
  //                   LeafB              |
  // ------------------------------------------------------------

  it("Updates Root and Library when Library is touched", function(done) {
    this.timeout(30000);

    touchContract('LibraryA', getContract('LibraryA'));

    CommandRunner.run("compile", config, function(err) {
      output = logger.contents();
      processErr(err, output);

      finalTimes = getArtifactStats();

      try {
        assert(initialTimes['Root'] < finalTimes['Root'], 'Should update root');
        assert(initialTimes['Branch'] === finalTimes['Branch'], 'Should not update Branch');
        assert(initialTimes['LeafA'] === finalTimes['LeafA'], 'Should not update LeafA');
        assert(initialTimes['LeafB'] === finalTimes['LeafB'], 'Should not update LeafB');
        assert(initialTimes['LeafC'] === finalTimes['LeafC'], 'Should not update LeafC');
        assert(initialTimes['LibraryA'] < finalTimes['LibraryA'], 'Should update LibraryA');
        assert(initialTimes['SameFile1'] === finalTimes['SameFile1'], 'Should not update SameFile1');
        assert(initialTimes['SameFile2'] === finalTimes['SameFile2'], 'Should not update SameFile2');
        done();
      } catch(err) {
        err.message += '\n\n' + output;
        throw new Error(err);
      }
    });
  });

  // -------------Inheritance Graph -----------------------------
  //                                      |
  //      LibA         LeafA              |    SameFile1 - LeafC
  //     /           /       \            |
  // Root* - Branch* -           - LeafC  |    SameFile2
  //                 \       /            |
  //                   LeafB              |
  // ------------------------------------------------------------

  it("Updates Branch and Root when Branch is touched", function(done) {
    this.timeout(30000);

    touchContract('Branch', getContract('Branch'));

    CommandRunner.run("compile", config, function(err) {
      output = logger.contents();
      processErr(err, output);

      finalTimes = getArtifactStats();

      try {
        assert(initialTimes['Root'] < finalTimes['Root'], 'Should update root');
        assert(initialTimes['Branch'] < finalTimes['Branch'], 'Should update Branch');
        assert(initialTimes['LeafA'] === finalTimes['LeafA'], 'Should not update LeafA');
        assert(initialTimes['LeafB'] === finalTimes['LeafB'], 'Should not update LeafB');
        assert(initialTimes['LeafC'] === finalTimes['LeafC'], 'Should not update LeafC');
        assert(initialTimes['LibraryA'] === finalTimes['LibraryA'], 'Should not update LibraryA');
        assert(initialTimes['SameFile1'] === finalTimes['SameFile1'], 'Should not update SameFile1');
        assert(initialTimes['SameFile2'] === finalTimes['SameFile2'], 'Should not update SameFile2');
        done();
      } catch(err) {
        err.message += '\n\n' + output;
        throw new Error(err);
      }
    });
  });

  // -------------Inheritance Graph -----------------------------
  //                                       |
  //      LibA          LeafA*             |    SameFile1 - LeafC
  //     /            /       \            |
  // Root* - Branch* -           - LeafC   |    SameFile2
  //                  \       /            |
  //                    LeafB              |
  // ------------------------------------------------------------

  it("Updates LeafA, Branch and Root when LeafA is touched", function(done) {
    this.timeout(30000);

    touchContract('LeafA', getContract('LeafA'));

    CommandRunner.run("compile", config, function(err) {
      output = logger.contents();
      processErr(err, output);

      finalTimes = getArtifactStats();

      try {
        assert(initialTimes['Root'] < finalTimes['Root'], 'Should update root');
        assert(initialTimes['Branch'] < finalTimes['Branch'], 'Should update Branch');
        assert(initialTimes['LeafA'] < finalTimes['LeafA'], 'Should update LeafA');
        assert(initialTimes['LeafB'] === finalTimes['LeafB'], 'Should not update LeafB');
        assert(initialTimes['LeafC'] === finalTimes['LeafC'], 'Should not update LeafC');
        assert(initialTimes['LibraryA'] === finalTimes['LibraryA'], 'Should not update LibraryA');
        assert(initialTimes['SameFile1'] === finalTimes['SameFile1'], 'Should not update SameFile1');
        assert(initialTimes['SameFile2'] === finalTimes['SameFile2'], 'Should not update SameFile2');
        done();
      } catch(err) {
        err.message += '\n\n' + output;
        throw new Error(err);
      }
    });
  });

  // -------------Inheritance Graph -----------------------------
  //                                       |
  //      LibA         LeafA*              |  SameFile1* - LeafC*
  //     /           /        \            |
  // Root* - Branch* -           - LeafC*  |  SameFile2*
  //                 \        /            |
  //                   LeafB*              |
  // ------------------------------------------------------------

  it("Updates everything except LibraryA when LeafC is touched", function(done) {
    this.timeout(30000);

    touchContract('LeafC', getContract('LeafC'));

    CommandRunner.run("compile", config, function(err) {
      output = logger.contents();
      processErr(err, output);

      finalTimes = getArtifactStats();

      try {
        assert(initialTimes['Root'] < finalTimes['Root'], 'Should update root');
        assert(initialTimes['Branch'] < finalTimes['Branch'], 'Should update Branch');
        assert(initialTimes['LeafA'] < finalTimes['LeafA'], 'Should update LeafA');
        assert(initialTimes['LeafB'] < finalTimes['LeafB'], 'Should update LeafB');
        assert(initialTimes['LeafC'] < finalTimes['LeafC'], 'Should update LeafC');
        assert(initialTimes['LibraryA'] === finalTimes['LibraryA'], 'Should not update LibraryA');
        assert(initialTimes['SameFile1'] < finalTimes['SameFile1'], 'Should update SameFile1');
        assert(initialTimes['SameFile2'] < finalTimes['SameFile2'], 'Should update SameFile2');
        done();
      } catch(err) {
        err.message += '\n\n' + output;
        throw new Error(err);
      }
    });
  });
});
