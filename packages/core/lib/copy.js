const cpr = require("cpr");
const fs = require("fs");
const _ = require("lodash");

const cpr_options = {
  deleteFirst: false,
  overwrite: false,
  confirm: true
};

// This module will copy a file or directory, and by default
// won't override individual files. If a file exists, it will
// simply move onto the next file.

const copy = function(from, to, extra_options) {
  const options = _.merge(_.clone(cpr_options), extra_options);

  return new Promise((resolve, reject) => {
    cpr(from, to, options, function(err, files) {
      reject(err);
      var new_files = [];

      // Remove placeholders. Placeholders allow us to copy "empty" directories,
      // but lets NPM and git not ignore them.
      files = files || [];
      for (let file of files) {
        if (file.match(/.*PLACEHOLDER.*/) != null) {
          fs.unlinkSync(file);
          continue;
        }
        new_files.push(file);
      }

      resolve(new_files);
    });
  });
};

copy.file = function(from, to) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(from, "utf8");
    const writeStream = fs.createWriteStream(to, "utf8");

    readStream.on("error", function(err) {
      reject(err);
      reject = function() {};
    });

    writeStream.on("error", function(err) {
      reject(err);
      reject = function() {};
    });

    writeStream.on("finish", function() {
      resolve();
    });

    readStream.pipe(writeStream);
  });
};

module.exports = copy;
