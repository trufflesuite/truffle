import * as webpack from "webpack";
import type WebpackDevServer from "webpack-dev-server";
import HtmlWebpackPlugin from "html-webpack-plugin";
import EslintWebpackPlugin from "eslint-webpack-plugin";
import TerserWebpackPlugin from "terser-webpack-plugin";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

const progressHandler = (function () {
  let lastLoggedPercent = -1;
  const minInterval = 15;

  return {
    log(percent: number, _message: string, ..._args: string[]) {
      percent = Math.round(percent * 1000) / 10;
      if (lastLoggedPercent < 0 || percent - lastLoggedPercent >= minInterval) {
        lastLoggedPercent = percent;
        console.log(`Compiling: ${percent}%`);
      } else if (percent === 100) {
        console.log(`Finished compiling`);
      }
    }
  };
})();

const config: webpack.Configuration = {
  mode: isProduction ? "production" : "development",
  entry: "./src/index.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve("build")
  },
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserWebpackPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction
          }
        }
      })
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      src: path.resolve("src")
    },
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      vm: require.resolve("vm-browserify")
    }
  },
  devtool: "nosources-source-map",
  devServer: {
    port: 3000,
    historyApiFallback: true,
    client: {
      reconnect: false,
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },
  stats: "minimal",
  module: {
    rules: [
      {
        test: [/\.jsx?$/, /\.tsx?$/],
        use: ["babel-loader"],
        exclude: /node_modules/
      },
      {
        test: /\.(png|ttf)$/,
        type: "asset/resource"
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser"
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      favicon: "./public/favicon.ico"
    }),
    new EslintWebpackPlugin({
      extensions: [".ts", ".tsx", ".js", ".jsx"]
    }),
    new webpack.ProgressPlugin(progressHandler.log)
  ]
};

export default config;
