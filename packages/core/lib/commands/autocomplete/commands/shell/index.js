module.exports = function (shell) {
  return {
    run: require("./run")(shell),
    meta: require("./meta")(shell)
  };
};
