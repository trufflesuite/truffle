const path = require("path");
const webpack = require("webpack");
const { merge } = require("webpack-merge");

const commonConfig = require("./webpack.config-common.js");

module.exports = merge(commonConfig, {
  mode: "development",
  module: {
    rules: [
      {
        test: /\.(js)/,
        include: path.resolve(__dirname, "..", "lib"),
        exclude: path.resolve(__dirname, "..", "node_modules"),
        use: "@jsdevtools/coverage-istanbul-loader"
      }
    ]
  },

  externals: [/^ganache$/],

  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("test")
    })
  ]
});
