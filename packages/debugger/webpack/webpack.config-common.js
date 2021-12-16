const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./debugger.js",
  devtool: false,
  target: "node",

  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                { targets: { node: "12.0" }, modules: false }
              ]
            ],
            plugins: ["@babel/plugin-transform-runtime"]
          }
        },
        exclude: [path.resolve(__dirname, "..", "node_modules")],
        include: [path.resolve(__dirname, "..", "lib")]
      }
    ]
  },

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

  plugins: [
    new webpack.SourceMapDevToolPlugin({
      test: /\.js$/,
      moduleFilenameTemplate: "[resource-path]",
      fallbackModuleFilenameTemplate: "[absolute-resource-path]?[hash]",
      module: true,
      filename: "debugger.js.map",
      sourceRoot: "../"
    })
  ],

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
