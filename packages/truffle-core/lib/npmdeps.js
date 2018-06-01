var fs = require("fs");
var path = require("path");
var Config = require("truffle-config");
var _ = require("lodash");
var toposort = require('toposort');

var NPMDependencies = {
  detect: function(rootConfig, options) {
    var logger = rootConfig.logger;

    var visitedPackages = {};
    var allDependencies = [];

    function getNPMDependenciesOf(pkgName, parentName) {
      if (visitedPackages[pkgName]) {
        if (visitedPackages[pkgName] instanceof Config && parentName) {
          allDependencies.push([pkgName, parentName]);
        }
        return;
      }

      visitedPackages[pkgName] = true;

      if (pkgName === ".") {
        pkgRoot = ".";
        visitedPackages[pkgName] = rootConfig;
      } else {
        pkgRoot = path.join(".", "node_modules", pkgName);

        var pkgOptions = _.assign({}, options, { workingDirectory: pkgRoot });
        delete pkgOptions.working_directory;
        var config = Config.detect(pkgOptions);

        // If package is a Truffle project, then the Truffle config
        // will be found in the package root.
        // Otherwise, skip this package.
        if (path.relative(pkgRoot, config.working_directory) !== '') {
          return;
        }

        config.packageName = pkgName;

        visitedPackages[pkgName] = config;
      }

      if (parentName) {
        allDependencies.push([pkgName, parentName]);
      }

      var pkgJsonPath = path.join(pkgRoot, "package.json");

      try {
        var pkgJsonStr = fs.readFileSync(pkgJsonPath);
      } catch(e) {
        if(pkgName !== ".")
          logger.log(pkgJsonPath + ' could not be read: ' + e);
        return;
      }

      try {
        var pkgJson = JSON.parse(pkgJsonStr);
      } catch(e) {
        if (e instanceof SyntaxError) {
          logger.log(pkgJsonPath + ' not valid JSON');
          return;
        }
        throw e;
      }

      _.keys(pkgJson.dependencies).forEach(function(dep) {
        getNPMDependenciesOf(dep, pkgName);
      });
    }

    getNPMDependenciesOf(".");

    var migrationSequence = allDependencies.length > 0 ? toposort(allDependencies) : ["."];
    var migrationConfigs = migrationSequence.map(function(pkgName) {
      var config = visitedPackages[pkgName];
      if (!(config instanceof Config)) {
        throw new ValueError(pkgName + " did not produce a config???");
      }
      return config;
    });

    migrationConfigs.forEach(function(config) {
      config.networks = rootConfig.networks;
      config.network = rootConfig.network;
      config.node_modules_directory = rootConfig.node_modules_directory;
    });

    return migrationConfigs;
  }
};

module.exports = NPMDependencies;
