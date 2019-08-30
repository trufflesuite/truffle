const Expect = {
  options(options, expected_keys) {
    expected_keys.forEach(key => {
      if (options[key] == null) {
        throw new Error(`Expected parameter '${key}' not passed to function.`);
      }
    });
  },

  one(options, expected_keys) {
    const found = [];

    expected_keys.forEach(key => {
      if (options[key] != null) {
        found.push(1);
      } else {
        found.push(0);
      }
    });

    const total = found.reduce((t, value) => t + value);

    // If this doesn't work in all cases, perhaps we should
    // create an expect.onlyOne() function.
    if (total < 1) {
      throw new Error(
        `Expected one of the following parameters, but found none: ${expected_keys.join(
          ", "
        )}`
      );
    }
  }
};

module.exports = Expect;
