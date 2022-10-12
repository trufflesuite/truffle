import Webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import webpackConfig from "../webpack.config";

const compiler = Webpack(webpackConfig);
const server = new WebpackDevServer(webpackConfig.devServer, compiler);

async function startServer() {
  await server.start();
}

startServer();
