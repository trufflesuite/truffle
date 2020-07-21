const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");
const pkg = require("./package.json");
const rootDir = path.join(__dirname, "../..");
const outputDir = path.join(__dirname, "build");

module.exports = {
  mode: "production",
  entry: {
    cli: path.join(
      __dirname,
      "../..",
      "node_modules",
      "@truffle/core",
      "cli.js"
    ),
    chain: path.join(
      __dirname,
      "../..",
      "node_modules",
      "@truffle/environment",
      "chain.js"
    ),
    analytics: path.join(
      __dirname,
      "../..",
      "node_modules",
      "@truffle/core",
      "lib",
      "services",
      "analytics",
      "main.js"
    ),
    library: path.join(
      __dirname,
      "../..",
      "node_modules",
      "@truffle/core",
      "index.js"
    ),
  },

  target: "node",
  node: {
    // For this option, see here: https://github.com/webpack/webpack/issues/1599
    __dirname: false,
    __filename: false,
  },
  context: rootDir,

  output: {
    path: outputDir,
    filename: "[name].bundled.js",
    library: "",
    libraryTarget: "commonjs",
  },
  devtool: "source-map",

  optimization: {
    minimize: false,
  },

  module: {
    rules: [
      // ignores "#!/bin..." lines inside files
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "../core"),
          path.resolve(__dirname, "../environment"),
        ],
        use: "shebang-loader",
      },
    ],
  },

  externals: [
    // truffle-config uses the original-require module.
    // Here, we leave it as an external, and use the original-require
    // module that's a dependency of Truffle instead.
    /^original-require$/,
    /^mocha$/,
  ],

  resolve: {
    alias: {
      "ws": path.join(__dirname, "./nil.js"),
      "bn.js": path.join(
        __dirname,
        "../..",
        "node_modules",
        "bn.js",
        "lib",
        "bn.js"
      ),
      "original-fs": path.join(__dirname, "./nil.js"),
      "scrypt": "js-scrypt",
    },
  },

  stats: {
    warnings: false,
  },

  plugins: [
    new webpack.DefinePlugin({
      BUNDLE_VERSION: JSON.stringify(pkg.version),
      BUNDLE_CHAIN_FILENAME: JSON.stringify("chain.bundled.js"),
      BUNDLE_ANALYTICS_FILENAME: JSON.stringify("analytics.bundled.js"),
      BUNDLE_LIBRARY_FILENAME: JSON.stringify("library.bundled.js"),
    }),

    // Put the shebang back on.
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node\n", raw: true }),

    // `truffle test`
    new CopyWebpackPlugin([
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "commands",
          "init",
          "initSource"
        ),
        to: "initSource",
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "Assert.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertAddress.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertAddressArray.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertAddressPayableArray.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertBalance.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertBool.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertBytes32.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertBytes32Array.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertGeneral.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertInt.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertIntArray.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertString.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertUint.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "AssertUintArray.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "NewSafeSend.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "testing",
          "OldSafeSend.sol"
        ),
      },
      {
        from: path.join(
          __dirname,
          "../..",
          "node_modules",
          "@truffle/core",
          "lib",
          "commands",
          "create",
          "templates/"
        ),
        to: "templates",
        flatten: true,
      },
    ]),

    new CleanWebpackPlugin(),

    // Make web3 1.0 packable
    new webpack.IgnorePlugin(/^electron$/),
  ],
};
