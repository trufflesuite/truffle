const path = require("path");
const webpack = require("webpack");

//TODO: there's probably a better way to do this where webpack is called once
//and it will generate both production and development packs
const suffix = process.env.NODE_ENV === "production" ? ".min" : "";
const entryName = `truffle-contract${suffix}`;

module.exports = {
  context: path.resolve(__dirname),
  entry: {
    [entryName]: "./index.js"
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "browser-dist"),
    library: {
      name: "TruffleContract",
      type: "global"
    }
  },
  devtool: "source-map",
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    }),
    new webpack.ProvidePlugin({
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
};
