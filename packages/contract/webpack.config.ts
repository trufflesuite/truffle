import { join as pathJoin } from "path";
import { Configuration, ProvidePlugin } from "webpack";
import { merge } from "webpack-merge";
import baseConfig from "../../webpack/webpack.config.base";

//TODO: there's probably a better way to do this where webpack is called once
//and it will generate both production and development packs
const suffix = process.env.NODE_ENV === "production" ? ".min" : "";
const entryName = `truffle-contract${suffix}`;

const config: Configuration = merge(baseConfig, {
  entry: {
    [entryName]: "./index.js"
  },
  context: __dirname,
  output: {
    filename: "[name].js",
    path: pathJoin(__dirname, "browser-dist"),
    library: {
      name: "TruffleContract",
      type: "global"
    }
  },
  plugins: [
    new ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    }),
    new ProvidePlugin({
      process: "process/browser"
    })
  ],
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      assert: require.resolve("assert/"),
      url: require.resolve("url/"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      vm: require.resolve("vm-browserify")
    }
  }
});

export default config;
