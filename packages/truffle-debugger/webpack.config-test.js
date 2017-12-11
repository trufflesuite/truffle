const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  context: path.resolve(__dirname, './lib'),

  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['babel-preset-env'],
        plugins: ['transform-object-rest-spread', 'transform-runtime'],
      },
      include: [
        path.resolve(__dirname, './lib'),
        path.resolve(__dirname, './test')
      ],
    }],
  },

  target: 'node',
  output: {
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
  },
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  devtool: "inline-cheap-module-source-map"
}
