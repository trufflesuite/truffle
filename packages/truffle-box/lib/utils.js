var fs = require("fs-extra");
var path = require("path");
var npm = require('npm-programmatic');

var Git = require("nodegit");


function readBoxConfig(destination) {
  // Find the truffle-init.json file, and remove anything that should be ignored.
  return new Promise(function(accept, reject) {
    fs.readFile(path.join(destination, "truffle-init.json"), "utf8", function(err, body) {
      // We can't read the file, so let's assume it doesn't exist.
      if (err) {
        return accept({});
      }

      try {
        body = JSON.parse(body);
      } catch (e) {
        // If the file exists but we can't parse it, let's expose that error.
        return reject(e);
      }


      accept(body);
    });
  });
}

function cleanupUnpack(boxConfig, destination) {
  var needingRemoval = boxConfig.ignore || [];

  // remove box config file
  needingRemoval.push("truffle-init.json");

  var promises = needingRemoval.map(function(file_path) {
    return path.join(destination, file_path);
  }).map(function(file_path) {
    return new Promise(function(accept, reject) {
      fs.remove(file_path, function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  });

  return Promise.all(promises);
}

function installBoxDependencies(boxConfig, destination) {
  // Run an npm install if a package.json exists.
  if (fs.existsSync(path.join(destination, "package.json")) == false) {
    return;
  }

  var pkg = fs.readFileSync(path.join(destination, "package.json"), "utf8");
  pkg = JSON.parse(pkg);

  var packages = [];

  Object.keys(pkg.dependencies || {}).forEach(function(name) {
    var version = pkg.dependencies[name];
    packages.push(name + "@" + version);
  });

  Object.keys(pkg.devDependencies || {}).forEach(function(name) {
    var version = pkg.devDependencies[name];
    packages.push(name + "@" + version);
  });

  return npm.install(packages, {
    cwd: destination
  });
}

module.exports = {
  downloadBox: function(url, destination) {
    return Git.Clone(url, destination, {
      fetchOpts: {
        callbacks: {
          certificateCheck: function() {
            return 1;
          },
          credentials: function(url, username) {
            return Git.Cred.sshKeyFromAgent(username);
          }
        }
      }
    });
  },

  unpackBox: function(destination) {
    var boxConfig;

    return Promise.resolve()
      .then(function() {
        return readBoxConfig(destination)
      })
      .then(function(cfg) {
        boxConfig = cfg;
      })
      .then(function() {
        return cleanupUnpack(boxConfig, destination);
      })
      .then(function() {
        return installBoxDependencies(boxConfig, destination);
      })
      .then(function() {
        return boxConfig;
      });
  }
}

