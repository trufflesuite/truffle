const webpack = require('webpack');
const WriteFilePlugin = require('write-file-webpack-plugin');
const merge = require("webpack-merge");

const commonConfig = require("./webpack.config-common.js");

const debuggerConfig = merge(commonConfig, {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development')
    }),

    new WriteFilePlugin(),
  ],
});

module.exports = debuggerConfig;
