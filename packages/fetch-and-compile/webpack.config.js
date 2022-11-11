const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./lib/index.ts",
  mode: "development",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
    alias: {
      "conf": path.resolve(__dirname, "emptyShim"),
      "fs-extra": path.resolve(__dirname, "emptyShim")
    },
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      assert: require.resolve("assert/"),
      fs: require.resolve("./emptyShim"),
      url: require.resolve("url/"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      module: require.resolve("./emptyShim"),
      constants: require.resolve("./emptyShim"),
      child_process: require.resolve("./emptyShim"),
      constants: require.resolve("./emptyShim"),
      readline: require.resolve("./emptyShim"),
      process: require.resolve("./emptyShim"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      timers: require.resolve("timers-browserify"),
      vm: require.resolve("vm-browserify")
    }
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "browser-dist")
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser"
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    })
  ]
};
