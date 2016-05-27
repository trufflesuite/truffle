var Expect = {
  options: function(options, expected_keys) {
    expected_keys.forEach(function(key) {
      if (options[key] == null) {
        throw new Error("Expected parameter '" + key + "' not passed to function.");
      }
    });
  }
}

module.exports = Expect;
