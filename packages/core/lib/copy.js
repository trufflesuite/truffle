const mvdir = require("mvdir");

const mvdirOptions = {
  log: false,
  overwrite: false,
  copy: true
};

const copy = async function (from, to, options) {
  return await mvdir(from, to, {
    ...mvdirOptions,
    ...options
  });
};

module.exports = copy;
