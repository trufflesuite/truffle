const { resolve, join } = require("path");
const { IgnorePlugin } = require("webpack");
const path = require("path");

const moduleRoot = resolve(__dirname, "..");
const outputPath = join(moduleRoot, "dist");

module.exports = {
  mode: "production",
  entry: join(moduleRoot, "src", "index.js"),
  target: "node",
  devtool: "source-map",
  output: {
    path: outputPath,
    filename: "index.js",
    library: "truffle-hdwallet-provider",
    libraryTarget: "umd",
    umdNamedDefine: true
  },
  externals: ["fs", "bindings", "any-promise", "websocket"],
  resolve: {
    alias: {
      // eth-block-tracker is es6 but automatically builds an es5 version for us on install. thanks eth-block-tracker!
      "eth-block-tracker": "eth-block-tracker/dist/es5/index.js",

      // replace native `scrypt` module with pure js `js-scrypt`
      "scrypt": "js-scrypt",

      // replace native `secp256k1` with pure js `elliptic.js`
      "secp256k1": "secp256k1/elliptic.js",
    }
  },
  plugins: [
    // ignore these plugins completely
    new IgnorePlugin(/^(?:electron|ws)$/)
  ]
};
