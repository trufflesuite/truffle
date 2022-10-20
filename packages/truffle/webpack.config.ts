import { join as pathJoin } from "path";
import path from "path";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import { DefinePlugin, Configuration } from "webpack";
import { merge } from "webpack-merge";
import baseConfig from "../../webpack/webpack.config.base";

const pkg = require("./package.json");
const commands = require("../core/lib/commands/commands");
const truffleLibraryDirectory = path.join(
  __dirname,
  "../..",
  "node_modules",
  "@truffle",
  "resolver",
  "solidity"
);

const truffleRequireDirectory = path.join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "@truffle",
  "require"
);

const commandsEntries = commands.reduce(
  (a: Record<string, string>, command: string) => {
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
  },
  {}
);

const config: Configuration = merge(baseConfig, {
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
  context: __dirname,
  output: {
    path: pathJoin(__dirname, "dist"),
    filename: "[name].bundled.js",
    library: {
      type: "commonjs2"
    },
    chunkLoading: "require"
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

  plugins: [
    new CleanWebpackPlugin(),
    new DefinePlugin({
      BUNDLE_VERSION: JSON.stringify(pkg.version),
      BUNDLE_CHAIN_FILENAME: JSON.stringify("chain.bundled.js"),
      BUNDLE_ANALYTICS_FILENAME: JSON.stringify("analytics.bundled.js"),
      BUNDLE_LIBRARY_FILENAME: JSON.stringify("library.bundled.js"),
      BUNDLE_CONSOLE_CHILD_FILENAME: JSON.stringify("consoleChild.bundled.js")
    }),

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
            "dashboard-frontend"
          ),
          to: "dashboard-frontend"
        },
        {
          from: path.join(
            truffleRequireDirectory,
            "lib",
            "sandboxGlobalContextTypes.ts"
          )
        }
      ]
    })
  ]
});

export default config;
