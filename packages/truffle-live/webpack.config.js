var path = require("path");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");

module.exports = {
  entry: {
    app: path.join(__dirname, "app", "javascripts", "app.jsx")
  },
  output: {
    path: path.join(__dirname, "build"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|es6)$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
      {
        test: /\.s?(c|a)?ss$/i,
        loader: ExtractTextPlugin.extract(["css-loader", "sass-loader"])
      },
      { test: /\.json$/i, loader: "json-loader" },
      { test: /\.jpg$/, loader: "file-loader?name=[path][name].[ext]" }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(["build"]),
    new CopyWebpackPlugin([
      { from: "./app/index.html", to: "index.html" },
      {
        from: path.join(
          __dirname,
          "..",
          "browser-truffle",
          "build",
          "truffle.bundled.js"
        ),
        to: "browser-truffle.js"
      }
    ]),
    new ExtractTextPlugin("[name].css")
  ],
  // resolve: { fallback: path.join(__dirname, "node_modules") },
  // resolveLoader: { fallback: path.join(__dirname, "node_modules") },
  devServer: {
    contentBase: path.join(__dirname, "build"),
    //compress: true,
    port: 9000
  }
};
