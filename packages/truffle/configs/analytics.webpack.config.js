const path = require("path");
const outputDir = path.join(__dirname, "../", "build");
const rootDir = path.join(__dirname, "../..");
const webpack = require("webpack");
const pkg = require("../package.json");

module.exports = {
  mode: "production",
  entry: path.join(
    __dirname,
    "../../..",
    "node_modules",
    "@truffle/core",
    "lib",
    "services",
    "analytics",
    "main.js"
  ),
  target: "node",
  context: rootDir,
  devtool: "source-map",
  node: {
    // For this option, see here: https://github.com/webpack/webpack/issues/1599
    __dirname: false,
    __filename: false
  },
  output: {
    path: outputDir,
    filename: "analytics.bundled.js",
    library: "",
    libraryTarget: "commonjs"
  },
  module: {
    rules: [
      // ignores "#!/bin..." lines inside files
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "../../core"),
          path.resolve(__dirname, "../../environment")
        ],
        use: "shebang-loader"
      }
    ]
  },

  externals: [
    // truffle-config uses the original-require module.
    // Here, we leave it as an external, and use the original-require
    // module that's a dependency of Truffle instead.
    /^original-require$/,
    /^mocha$/
  ],
  plugins: [
    new webpack.DefinePlugin({
      BUNDLE_VERSION: JSON.stringify(pkg.version),
      BUNDLE_CHAIN_FILENAME: JSON.stringify("chain.bundled.js"),
      BUNDLE_ANALYTICS_FILENAME: JSON.stringify("analytics.bundled.js"),
      BUNDLE_LIBRARY_FILENAME: JSON.stringify("library.bundled.js")
    }),

    // Put the shebang back on.
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node\n", raw: true }),

    // Make web3 1.0 packable
    new webpack.IgnorePlugin(/^electron$/)
  ],
  resolve: {
    alias: {
      "ws": path.join(__dirname, "./nil.js"),
      "bn.js": path.join(
        __dirname,
        "../../..",
        "node_modules",
        "bn.js",
        "lib",
        "bn.js"
      ),
      "original-fs": path.join(__dirname, "./nil.js"),
      "scrypt": "js-scrypt"
    }
  },
  stats: {
    warnings: false
  }
};
