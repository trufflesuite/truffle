var fs = require("fs-extra");
var path = require("path");
var ghdownload = require('github-download');
var request = require('request');
var vcsurl = require('vcsurl');
var parseURL = require('url').parse;
var tmp = require('tmp');
var exec = require('child_process').exec;
var cwd = require('process').cwd();
var inquirer = require('inquirer');

var config = require('../config');

function checkDestination(destination) {
  return Promise.resolve()
    .then(() => {
      const contents = fs.readdirSync(destination);
      if (contents.length) {
        console.log("Something already exists in this folder...");
      }
  });
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

async function copyTempIntoDestination(tmpDir, destination) {
    const currentContent = fs.readdirSync(destination);
      if (currentContent.length > 1) {
        const tmpContent = fs.readdirSync(tmpDir);
        for (let file of tmpContent) {
           if (currentContent.includes(file)) {
             var overwriting = [
  		{
    		type: 'confirm',
    		name: 'overwrite',
    		message: `Overwrite ${file}?`,
    		default: false
  		}]
             await inquirer.prompt(overwriting)
               .then(async answer => {
                 if (answer.overwrite) {
                   try {
                     await fs.remove(file);
                     await fs.copy(tmpDir+"/"+file, destination+"/"+file);
 		    } catch (err) {
                      console.error(err); 
                    }
                 }
               });
            } else {
              try {
                await fs.copy(tmpDir+"/"+file, destination+"/"+file);
              } catch (err) {
                console.error(err);
              }
            }
        }
      } else {
        try {
          await fs.copy(tmpDir, destination);
        } catch (err) {
          console.error(err);
        }
      }
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
