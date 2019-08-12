const webpack = require("webpack");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");

// TODO: I have no idea if I'm a terrible person for this. The idea here is to not
// copy a whole config.
// FIXME!!! FYI: packages/truffle/build will be cleaned each time. That's no good.
var config = require(path.join(
  __dirname,
  "..",
  "truffle",
  "./cli.webpack.config.js"
));

config.entry = {
  truffle: ["babel-polyfill", path.join(__dirname, "browser-truffle.js")]
};

config.target = "web";

// HACK: We need to ensure we don't clean the truffle build directory.
// To do this, we remove the instance of CleanWebpackPlugin that it created.
// Note that the clean webpack plugin is the second to last defined in the
// original config.
config.plugins.splice(config.plugins.length - 2, config.plugins.length - 2);
config.plugins.push(new CleanWebpackPlugin(["build"]));

// HACK: Remove shebang plugin
config.plugins.splice(1, 1);

const browserFSBase = path.dirname(require.resolve("browserfs"));

//For the following changes, see: https://github.com/jvilk/BrowserFS
config.resolve.alias["fs"] = path.join(browserFSBase, "shims", "fs.js");
config.resolve.alias["buffer"] = path.join(browserFSBase, "shims", "buffer.js");
config.resolve.alias["path"] = path.join(browserFSBase, "shims", "path.js");
config.resolve.alias["processGlobal"] = path.join(
  browserFSBase,
  "shims",
  "process.js"
);
config.resolve.alias["bufferGlobal"] = path.join(
  browserFSBase,
  "shims",
  "bufferGlobal.js"
);
config.resolve.alias["bfsGlobal"] = require.resolve("browserfs");

config.module.noParse = /browserfs\.js/;

config.plugins.push(
  new webpack.ProvidePlugin({
    BrowserFS: "bfsGlobal",
    process: "processGlobal",
    Buffer: "bufferGlobal"
  })
);

config.node.process = false;
config.node.Buffer = false;

// Make sure we stay within our directory
config.output.path = path.join(__dirname, "build");

// Export at Truffle
config.output.library = "[name]";
config.output.libraryTarget = "umd";

config.externals = [];

// Add our own shims. See individual shim files for shimming strategy.
config.resolve.alias["module"] = path.join(__dirname, "shims", "module.js");
config.resolve.alias["original-require"] = path.join(
  __dirname,
  "shims",
  "original-require.js"
);
config.resolve.alias["child_process"] = path.join(
  __dirname,
  "shims",
  "child_process.js"
);
config.resolve.alias["write-file-atomic"] = path.join(
  __dirname,
  "shims",
  "write-file-atomic.js"
);
config.resolve.alias["ora"] = path.join(__dirname, "shims", "ora.js");
config.resolve.alias["request"] = path.join(__dirname, "shims", "request.js");
config.resolve.alias["readline"] = path.join(__dirname, "shims", "readline.js");
config.resolve.alias["net"] = path.join(__dirname, "shims", "net.js");

// The following aliases let modules be imported, but push errors off until runtime.
// This makes debugging easier, as there's a clear stack trace of where the module is used.
config.resolve.alias["tls"] = path.join(__dirname, "shims", "nil.js");
config.resolve.alias["dgram"] = path.join(__dirname, "shims", "nil.js");
config.resolve.alias["repl"] = path.join(__dirname, "shims", "nil.js");

// os-locale is used by yargs to look up locals; yargs will default to en without it
// We shim os-locale because a dependency of os-locale explodes when used.
config.resolve.alias["os-locale"] = path.join(__dirname, "shims", "nil.js");

// Remove our analytics for now
config.plugins.push(
  new webpack.NormalModuleReplacementPlugin(
    /\.\/lib\/services\/analytics/,
    path.join(__dirname, "shims", "analytics.js")
  )
);

// Copy index.html over, and the latest copy of Solidity
config.plugins.push(
  new CopyWebpackPlugin([
    {
      from: path.join(__dirname, "index.html")
    }
  ])
);

// Use babel (see https://webpack.js.org/loaders/babel-loader/)
config.module.rules.push({
  test: /\.m?js$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: "babel-loader",
    options: {
      presets: ["es2015", "stage-0"]
    }
  }
});

config.devServer = {
  contentBase: config.output.path,
  //compress: true,
  port: 9000
};

module.exports = config;
