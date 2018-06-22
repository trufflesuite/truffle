const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: "./debugger",

  module: {
    rules: [{
      test: /\.js$/,
      loader: "babel-loader",
      query: {
        presets: [
          [
            'babel-preset-env',
            { targets: { "node": "6.14" } }
          ]
        ],
        plugins: ['transform-object-rest-spread', 'transform-runtime'],
      },
      include: [
        path.resolve(__dirname, "..", 'lib')
      ],
    }],
  },

  target: 'node',

  output: {
    library: "Debugger",
    libraryTarget: "umd",
    umdNamedDefine: true,

    filename: "debugger.js",
    path: path.join(__dirname, "..", "dist"),
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
  },

  resolve: {
    modules: [path.resolve(__dirname, ".."), "node_modules"]
  },

  // in order to ignore all modules in node_modules folder
  externals: [nodeExternals({
    modulesFromFile: true,
    whitelist: [
      "node-interval-tree"
    ]
  })],

  devtool: "inline-cheap-module-source-map",
}
