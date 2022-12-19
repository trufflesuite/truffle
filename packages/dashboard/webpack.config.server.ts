import { join as pathJoin } from "path";
import { Configuration } from "webpack";
import { merge } from "webpack-merge";
import baseConfig from "../../webpack/webpack.config.base";

const config: Configuration = {
  name: "dashboard-server",
  entry: {
    "index": {
      import: "./build/lib/index.js",
      filename: "lib/index.js",
      library: {
        type: "commonjs2"
      },
      chunkLoading: "require"
    },
    "start-dashboard": {
      import: "./build/bin/start-dashboard.js",
      filename: "bin/start-dashboard.js",
      library: {
        type: "commonjs2"
      },
      chunkLoading: "require"
    }
  },
  context: __dirname,
  output: {
    path: pathJoin(__dirname, "dist"),
    library: {
      type: "commonjs2"
    }
  }
};

export default merge(baseConfig, config);
