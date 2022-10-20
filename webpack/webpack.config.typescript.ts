import { Configuration } from "webpack";
// import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

const config: Configuration = {
  module: {
    rules: [
      {
        // test: /.+(?<!\.d)\.tsx?$/,
        test: /\.tsx?$/,
        loader: "ts-loader",
        // add transpileOnly option if you use ts-loader < 9.3.0
        options: {
          compiler: "ttypescript",
          transpileOnly: false,
          projectReferences: true,
          compilerOptions: {
            declaration: true,
            sourceMap: true,
            skipLibCheck: true,
            skipDefaultLibCheck: true
          }
        }
      }
    ]
  },

  resolve: {
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"]
  },
  plugins: [
    /*new ForkTsCheckerWebpackPlugin({
      typescript: {
        build: true,
        configOverwrite: {
          compilerOptions: {
            skipLibCheck: true,
            declaration: true
          }
        },
        configFile: "./tsconfig.json"
      }
    }),*/
  ]
};

export default config;
