module.exports = function(contents, file, config, process, callback) {

  var includes = config.frontend.includes_order.map(function(key) {
    return config.frontend.includes[key];
  });

  process(config, includes, function(err, processed) {
    if (err != null) {
      callback(err);
      return;
    }

    callback(null, processed + "\n\n" + contents);
  });
};
