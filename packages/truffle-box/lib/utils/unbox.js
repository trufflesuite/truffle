var fs = require("fs-extra");
var path = require("path");
var ghdownload = require('github-download');
var request = require('request');
var vcsurl = require('vcsurl');
var parseURL = require('url').parse;
var tmp = require('tmp');
var exec = require('child_process').exec;
var cwd = require('process').cwd();

var config = require('../config');

function checkDestination(destination) {
  return Promise.resolve().then(function() {

    var contents = fs.readdirSync(destination);
    if (contents.length) {
      var err = "Something already exists at the destination. " +
                "`truffle init` and `truffle unbox` must be executed in an empty folder. " +
                "Stopping to prevent overwriting data."

      throw new Error(err);
    }
  })
}

function verifyURL(url) {
  // Next let's see if the expected repository exists. If it doesn't, ghdownload
  // will fail spectacularly in a way we can't catch, so we have to do it ourselves.
  return new Promise(function(accept, reject) {

    var configURL = parseURL(
      vcsurl(url)
        .replace("github.com", "raw.githubusercontent.com")
        .replace(/#.*/, "") +
        "/master/truffle.js"
    );

    var options = {
      method: 'HEAD',
      uri: 'https://' + configURL.host + configURL.path
    };
    request(options, function(error, r) {
      if (error) {
        return reject(new Error(
          "Error making request to " + options.uri + ". Got error: " + error.message +
          ". Please check the format of the requested resource."
        ));
      } else if (r.statusCode == 404) {
        return reject(new Error("Truffle Box at URL " + url + " doesn't exist. If you believe this is an error, please contact Truffle support."));
      } else if (r.statusCode != 200) {
        return reject(new Error("Error connecting to github.com. Please check your internet connection and try again."));
      }
      accept();
    });
  });
}

function setupTempDirectory() {
  return new Promise(function(accept, reject) {
    tmp.dir({dir: cwd, unsafeCleanup: true}, function(err, dir, cleanupCallback) {
      if (err) return reject(err);

      accept(path.join(dir, "box"), cleanupCallback);
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
  var possibleConfigs = [
    path.join(destination, "truffle-box.json"),
    path.join(destination, "truffle-init.json")
  ];

  var configPath = possibleConfigs.reduce(function(path, alt) {
    return path || fs.existsSync(alt) && alt;
  }, undefined);

  return config.read(configPath);
}

function cleanupUnpack(boxConfig, destination) {
  var needingRemoval = boxConfig.ignore || [];

  // remove box config file
  needingRemoval.push("truffle-box.json");
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
  var postUnpack = boxConfig.hooks['post-unpack']

  return new Promise(function(accept, reject) {
    if (postUnpack.length === 0) {
      return accept();
    }

    exec(postUnpack, {cwd: destination}, function(err, stdout, stderr) {
      if (err) return reject(err);
      accept(stdout, stderr);
    });
  });
}

module.exports = {
  checkDestination: checkDestination,
  verifyURL: verifyURL,
  setupTempDirectory: setupTempDirectory,
  fetchRepository: fetchRepository,
  copyTempIntoDestination: copyTempIntoDestination,
  readBoxConfig: readBoxConfig,
  cleanupUnpack: cleanupUnpack,
  installBoxDependencies: installBoxDependencies
}
