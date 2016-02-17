var pkg = require("./package.json");
var webpack = require("webpack");
var path = require("path");

var entry = {};
entry[`${pkg.name}.js`] = "./index.js";
entry[`${pkg.name}.min.js`] = "./index.js";

module.exports = {
  entry: entry,
  output: {
    path: "./dist",
    filename: `[name]`,

    // Output as a library usable outside of webpack
    libraryTarget: "var",
    library: "Pudding"
  },
  externals: {
    "bluebird": "Promise"
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
  ],
  resolve: {
    root: [
      path.join(__dirname, "./", "node_modules"),
    ],
    extensions: ['', '.js', '.json']
  }
};
