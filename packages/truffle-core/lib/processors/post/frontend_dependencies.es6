module.exports = function(contents, file, config, process, callback) {
  process(config, config.frontend.includes, function(err, processed) {
    if (err != null) {
      callback(err);
      return;
    }

    callback(null, processed + "\n\n" + contents);
  });
};
