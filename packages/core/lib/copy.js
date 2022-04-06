const mvdir = require("mvdir");

const mvdirOptions = {
  log: false,
  overwrite: true,
  copy: true
};

const copy = async function (from, to, options) {
  // mvdir returns undefined if successful, an error if not
  const error = await mvdir(from, to, {
    ...mvdirOptions,
    ...options
  });
  if (error) {
    throw error;
  }
};

module.exports = copy;
