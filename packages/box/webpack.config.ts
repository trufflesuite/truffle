import { join as pathJoin } from "path";
import { Configuration } from "webpack";
import { merge } from "webpack-merge";
import baseConfig from "../../webpack/webpack.config.base";

const config: Configuration = merge(baseConfig, {
  entry: {
    index: "./build/index.js",

    // these entrypoints are exposed for testing purposes and are not considered public:
    utils: "./build/utils/index.js",
    config: "./build/config.js"
  },
  context: __dirname,
  output: {
    path: pathJoin(__dirname, "dist"),
    filename: "[name].js",
    library: {
      type: "commonjs2"
    },
    chunkLoading: "require"
  }
});

export default config;
