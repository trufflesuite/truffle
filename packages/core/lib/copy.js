const mvdir = require("mvdir");

const mvdirOptions = {
  log: false,
  overwrite: false,
  copy: true
};

const copy = async function (from, to) {
  await mvdir(from, to, mvdirOptions);
};

module.exports = copy;
