import * as webpack from "webpack";
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
  entry: "./frontend-build/index.js",
  target: "web",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist", "dashboard-frontend")
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
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@truffle/dashboard-message-bus-client": path.resolve(
        __dirname,
        "..",
        "dashboard-message-bus-client",
        "build"
      ),
      "@truffle/dashboard-message-bus-common": path.resolve(
        __dirname,
        "..",
        "dashboard-message-bus-common",
        "build"
      ),
      "src": path.resolve(__dirname, "src")
    },
    fallback: {
      buffer: require.resolve("buffer"),
      crypto: require.resolve("crypto-browserify"),
      fs: false,
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      net: false,
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      tls: false,
      tty: require.resolve("tty-browserify"),
      vm: require.resolve("vm-browserify"),
      zlib: require.resolve("zlib-browserify")
    }
  },
  // Would use "nosources-source-map" but this doesn't work properly with
  // terser. For more info, see:
  // https://webpack.js.org/plugins/terser-webpack-plugin/#note-about-source-maps
  devtool: "source-map",
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
      /*{
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"]
      },*/
      {
        test: /\.(png|ttf)$/,
        type: "asset/resource"
      }
    ]
  },
  ignoreWarnings: [/Failed to parse source map/],
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /\.d\.tsx?$/,
      contextRegExp: /.*/
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /\.map$/,
      contextRegExp: /.*/
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"]
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "public", "index.html"),
      favicon: path.resolve(__dirname, "public", "favicon.ico")
    }),
    new EslintWebpackPlugin({
      extensions: [".js", ".jsx"]
    }),
    new webpack.ProgressPlugin(progressHandler.log)
  ]
};

export default config;
