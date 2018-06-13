const express = require("express");
const middleware = require("webpack-dev-middleware");
const remotedev = require("remotedev-server");
const webpack = require("webpack");

const config = require("./webpack.config-dev.js");

const port = 3000;

const compiler = webpack(config);
const app = express();


app.use(middleware(compiler, {
}));


app.listen(port, () => {
  console.log(`Listening on port ${port}...`);

  console.log(`Starting remotedev-server`);
  remotedev({
    hostname: "localhost",
    port: 11117
  });
});
