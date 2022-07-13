const path = require("path");

//TODO: there's probably a better way to do this where webpack is called once
//and it will generate both production and development packs
const suffix = process.env.NODE_ENV === "production" ? ".min" : "";
const entryName = `truffle-contract${suffix}`;

module.exports = {
  context: path.resolve(__dirname),
  entry: {
    [entryName]: "./index.js"
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "TruffleContract",
      type: "commonjs"
    }
  },
  devtool: "source-map",
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      vm: require.resolve("vm-browserify")
    }
  }
};
