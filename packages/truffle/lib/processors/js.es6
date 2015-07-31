// Javascript processor doesn't do anything.
module.exports = function(contents, file, config, process, callback) {
  callback(null, contents);
};
