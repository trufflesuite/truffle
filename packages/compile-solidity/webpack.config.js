const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/compileInWebWorker/worker.ts",
  mode: "development",
  devtool: "inline-source-map",
  target: "webworker",
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
    fallback: {
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      stream: require.resolve("stream-browserify")
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  output: {
    filename: "bundledWorker.js",
    path: path.resolve(__dirname, "dist", "compileInWebWorker")
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser"
    })
  ]
};
