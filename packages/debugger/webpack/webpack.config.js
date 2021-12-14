const { merge } = require("webpack-merge");

const commonConfig = require("./webpack.config-common.js");

const debuggerConfig = merge(commonConfig, {
  mode: "production"
});

module.exports = debuggerConfig;
