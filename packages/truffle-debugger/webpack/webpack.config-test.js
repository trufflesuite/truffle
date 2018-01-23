const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');

const commonConfig = require('./webpack.config-common.js');

module.exports = merge(commonConfig, {
  module: {
    rules: [{
      test: /\.js$/,
      include: [
        path.resolve(__dirname, './test')
      ],
    }],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('test')
    }),
  ],
});
