var pkg = require("./package.json");
var webpack = require("webpack");

var entry = {};
entry[`${pkg.name}.js`] = "./index.js";
entry[`${pkg.name}.min.js`] = "./index.js";

module.exports = {
  entry: entry,
  output: {
    path: "./dist",
    filename: `[name]`
  },
  module: {
    loaders: [
      { test: /\.json$/i, loader: "json"}
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      include: /\.min\.js$/,
      minimize: true,
      compress: {
        warnings: false
      }
    })
  ]
};
