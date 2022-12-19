import { join as pathJoin } from "path";
import { Configuration, ProvidePlugin } from "webpack";
import { merge } from "webpack-merge";
import baseConfig from "../../webpack/webpack.config.base";

const mainConfig: Configuration = merge(baseConfig, {
  mode: "production",
  entry: {
    "truffle-contract.min": "./index.js"
  },
  context: __dirname,
  output: {
    filename: "[name].js",
    path: pathJoin(__dirname, "browser-dist"),
    library: {
      name: "TruffleContract",
      type: "global"
    }
  },
  plugins: [
    new ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    }),
    new ProvidePlugin({
      process: "process/browser"
    })
  ],
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      assert: require.resolve("assert/"),
      url: require.resolve("url/"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      vm: require.resolve("vm-browserify")
    }
  }
});

export default [
  mainConfig,
  merge(mainConfig, {
    mode: "development",
    entry: { "truffle-contract": "./index.js" }
  })
];
