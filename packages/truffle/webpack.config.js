const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");
const pkg = require("./package.json");
const rootDir = path.join(__dirname, "../..");
const outputDir = path.join(__dirname, "build");
const commands = require("../core/lib/commands/commands");
const truffleLibraryDirectory = path.join(
  __dirname,
  "../..",
  "node_modules",
  "@truffle",
  "resolver",
  "solidity"
);

const truffleRequireDistDirectory = path.join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "@truffle",
  "require",
  "dist"
);

const commandsEntries = commands.reduce((a, command) => {
  a[command] = path.join(
    __dirname,
    "../..",
    "node_modules",
    "@truffle/core",
    "lib",
    "commands",
    command,
    "index.js"
  );
  return a;
}, {});

module.exports = {
  mode: "production",
  entry: {
    ...commandsEntries,
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
    consoleChild: path.join(
      __dirname,
      "../..",
      "node_modules",
      "@truffle/core",
      "lib",
      "console-child.js"
    )
  },

  target: "node",
  node: {
    // For this option, see here:
    // https://github.com/webpack/webpack/issues/1599#issuecomment-186841345
    __dirname: false,
    __filename: false
  },
  context: rootDir,

  output: {
    path: outputDir,
    filename: "[name].bundled.js",
    libraryTarget: "commonjs",
    chunkLoading: "require"
  },

  // There are many source map options we can choose. Choosing an option with
  // "nosources" allows us to reduce the size of the bundle while still allowing
  // high quality source maps.
  devtool: "nosources-source-map",

  optimization: {
    minimize: false,
    splitChunks: {
      // The following two items splits the bundle into pieces ("chunks"),
      // where each chunk is less than 5 million bytes (shorthand for roughly
      // 5 megabytes). The first option, `chunks: all`, is the main powerhouse:
      // it'll look at common chunks (pieces of code) between each entry point
      // and separates them its own bundle. When an entry point is run,
      // the necessary chunks will be automatically required as needed.
      // This significantly speeds up bundle runtime because a) chunks can be
      // cached by node (e.g., within the `require` infrastructure) and b) we
      // won't `require` any chunks not needed by the command run by the user.
      // It also reduces the total bundle size since chunks can be shared
      // between entry points.
      chunks: "all",
      // I chose 5000000 based on anecdotal results on my machine. Limiting
      // the size to 5000000 bytes shaved off a few hundreths of a milisecond.
      // The negative here is creates more chunks. We can likely remove it and
      // let webpack decide with `chunks: all` if we prefer.
      maxSize: 5000000
    }
  },

  module: {
    rules: [
      // ignores "#!/bin..." lines inside files
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "../core"),
          path.resolve(__dirname, "../environment")
        ],
        use: "shebang-loader"
      },
      {
        //needed to get things working with lerna 4.0
        test: /rx\.lite\.aggregates\.js$/,
        parser: { amd: false }
      }
    ]
  },

  externals: [
    // truffle-config uses the original-require module.
    // Here, we leave it as an external, and use the original-require
    // module that's a dependency of Truffle instead.
    /^original-require$/,
    /^mocha$/,
    /^@truffle\/debugger/, //no longer part of the bundle to keep size down
    /^@truffle\/db/,
    // this will be installed as a dependency of packages/truffle
    /^@truffle\/db-loader/,
    /^ganache$/,
    // this is the commands portion shared by cli.js and console-child.js
    /^\.\/commands.bundled.js$/,
    /^ts-node$/,
    /^typescript$/
  ],

  resolve: {
    alias: {
      "bn.js": path.join(
        __dirname,
        "../..",
        "node_modules",
        "bn.js",
        "lib",
        "bn.js"
      ),
      "original-fs": path.join(__dirname, "./nil.js"),
      scrypt: "js-scrypt"
    }
  },

  stats: {
    warnings: false
  },

  plugins: [
    new webpack.DefinePlugin({
      BUNDLE_VERSION: JSON.stringify(pkg.version),
      BUNDLE_CHAIN_FILENAME: JSON.stringify("chain.bundled.js"),
      BUNDLE_ANALYTICS_FILENAME: JSON.stringify("analytics.bundled.js"),
      BUNDLE_LIBRARY_FILENAME: JSON.stringify("library.bundled.js"),
      BUNDLE_CONSOLE_CHILD_FILENAME: JSON.stringify("consoleChild.bundled.js")
    }),

    // Put the shebang back on.
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node\n", raw: true }),

    new webpack.ProgressPlugin(),

    // `truffle test`
    new CopyWebpackPlugin({
      patterns: [
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
          to: "initSource"
        },
        {
          from: path.join(truffleLibraryDirectory, "Assert.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertAddress.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertAddressArray.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertBalance.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertBool.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertBytes32.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertBytes32Array.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertGeneral.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertInt.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertIntArray.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertString.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertUint.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "AssertUintArray.sol")
        },
        {
          from: path.join(truffleLibraryDirectory, "SafeSend.sol")
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
          to: "templates"
        },
        {
          from: path.join(
            __dirname,
            "../..",
            "node_modules",
            "@truffle/dashboard",
            "dist",
            "lib",
            "dashboard-frontend"
          ),
          to: "dashboard-frontend"
        },
        {
          from: path.join(
            truffleRequireDistDirectory,
            "sandboxGlobalContextTypes.ts"
          )
        }
      ]
    }),

    new CleanWebpackPlugin(),

    // Make web3 1.0 packable
    new webpack.IgnorePlugin({ resourceRegExp: /^electron$/ })
  ]
};
