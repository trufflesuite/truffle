const webpack = require("webpack");
const {merge} = require("webpack-merge");

const commonConfig = require("./webpack.config-common.js");

const debuggerConfig = merge(commonConfig, {
  mode: "development",
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("development")
    }),
  ]
});

module.exports = debuggerConfig;
