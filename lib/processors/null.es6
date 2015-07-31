// Null processor doesn't do anything, and will never do anything.
module.exports = function(contents, file, config, process, callback) {
  callback(null, contents);
};
