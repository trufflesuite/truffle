const path = require("path");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./debugger.js",
  devtool: "source-map",
  target: "node",

  output: {
    clean: true,
    library: "Debugger",
    libraryTarget: "umd",
    umdNamedDefine: true,

    filename: "debugger.js",
    path: path.join(__dirname, "..", "dist"),
    devtoolModuleFilenameTemplate: "[absolute-resource-path]",
    devtoolFallbackModuleFilenameTemplate: "[absolute-resource-path]?[hash]"
  },

  resolve: {
    modules: [path.resolve(__dirname, ".."), "node_modules"]
  },

  // in order to ignore all modules in node_modules folder
  externals: [
    nodeExternals({
      modulesFromFile: true,
      allowlist: ["node-interval-tree"]
    })
  ]
};
