var Expect = {
  options: function(options, expected_keys) {
    expected_keys.forEach(function(key) {
      if (options[key] == null) {
        throw new Error("Expected parameter '" + key + "' not passed to function.");
      }
    });
  },

  one: function(options, expected_keys) {
    var found = [];

    expected_keys.forEach(function(key) {
      if (options[key] != null) {
        found.push(1);
      } else {
        found.push(0);
      }
    });

    var total = found.reduce(function(t, value) {
      return t + value;
    });

    if (total == 1) return;

    var amount = total;

    if (total == 0) {
      amount = "none"
    }

    throw new Error("Expected one of the following parameters, but found " + amount + ": " + expected_keys.join(", "));
  }
}

module.exports = Expect;
