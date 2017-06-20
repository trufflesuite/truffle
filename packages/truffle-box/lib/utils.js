var fs = require("fs-extra");
var path = require("path");
var npm = require('npm-programmatic');
var ghdownload = require('github-download');
var https = require("https");
var vcsurl = require('vcsurl');
var parseURL = require('url').parse;
var tmp = require('tmp');

function checkDestination(destination) {
  return Promise.resolve().then(function() {
    var config_path = path.join(destination, "truffle.js");
    var alternate_path = path.join(destination, "truffle-config.js");

    if (fs.existsSync(config_path) || fs.existsSync(alternate_path)) {
      throw new Error("A Truffle project already exists at the destination. Stopping to prevent overwriting data.");
    }
  })
}

function verifyURL(url) {
  // Next let's see if the expected repository exists. If it doesn't, ghdownload
  // will fail spectacularly in a way we can't catch, so we have to do it ourselves.
  return new Promise(function(accept, reject) {

    var configURL = parseURL(
      vcsurl(url).replace("github.com", "raw.githubusercontent.com") +
        "/master/truffle.js"
    );

    var options = {
      method: 'HEAD',
      host: configURL.host,
      path: configURL.path
    };
    var req = https.request(options, function(r) {
      if (r.statusCode == 404) {
        return reject(new Error("Truffle Box at URL " + url + " doesn't exist. If you believe this is an error, please contact Truffle support."));
      } else if (r.statusCode != 200) {
        return reject(new Error("Error connecting to github.com. Please check your internet connection and try again."));
      }
      accept();
    });
    req.end();

  });
}

function setupTempDirectory() {
  return new Promise(function(accept, reject) {
    tmp.dir(function(err, path, cleanupCallback) {
      if (err) return reject(err);

      accept(path, cleanupCallback);
    });
  });
}

function fetchRepository(url, dir) {
  return new Promise(function(accept, reject) {
    // Download the package from github.
    ghdownload(url, dir)
      .on('err', function(err) {
        reject(err);
      })
      .on('end', function() {
        accept();
      });
  });
}

function copyTempIntoDestination(tmpDir, destination) {
  return new Promise(function(accept, reject) {
    fs.copy(tmpDir, destination, function(err) {
      if (err) return reject(err);
      accept();
    });
  });
}

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
    var tmpDir;
    var tmpCleanup;

    return Promise.resolve()
      .then(function() {
        return checkDestination(destination);
      })
      .then(function() {
        return verifyURL(url);
      })
      .then(function() {
        return setupTempDirectory();
      }).then(function(dir, func) {
        // save tmpDir result
        tmpDir = dir;
        tmpCleanup = func;
      })
      .then(function() {
        return fetchRepository(url, tmpDir);
      })
      .then(function() {
        return copyTempIntoDestination(tmpDir, destination);
      })
      .then(tmpCleanup);
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
