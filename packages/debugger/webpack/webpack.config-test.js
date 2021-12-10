const path = require("path");
const webpack = require("webpack");
const { merge } = require("webpack-merge");

const commonConfig = require("./webpack.config-common.js");

module.exports = merge(commonConfig, {
  mode: "development",
  module: {
    rules: [
      {
        test: /\.(js)/,
        include: path.resolve(__dirname, "..", "lib"),
        exclude: path.resolve(__dirname, "..", "node_modules"),
        use: "@jsdevtools/coverage-istanbul-loader"
      },
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
        include: [
          path.resolve(__dirname, "..", "lib"),
          path.resolve(__dirname, "..", "test")
        ]
      }
    ]
  },

  externals: [
    /^ganache$/,
  ],

  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("test")
    })
  ]
});
