import path from "path";
import {
  BannerPlugin,
  ProgressPlugin,
  IgnorePlugin,
  Configuration
} from "webpack";

const config: Configuration = {
  mode: "production",
  target: "node",
  node: {
    // For this option, see here:
    // https://github.com/webpack/webpack/issues/1599#issuecomment-186841345
    __dirname: false,
    __filename: false
  },

  // There are many source map options we can choose. Choosing an option with
  // "nosources" allows us to reduce the size of the bundle while still allowing
  // high quality source maps.
  devtool: "nosources-source-map",

  optimization: {
    minimize: false,
    splitChunks: {
      // The following two items splits the bundle into pieces ("chunks"),
      // where each chunk is less than 5 million bytes (shorthand for roughly
      // 5 megabytes). The first option, `chunks: all`, is the main powerhouse:
      // it'll look at common chunks (pieces of code) between each entry point
      // and separates them its own bundle. When an entry point is run,
      // the necessary chunks will be automatically required as needed.
      // This significantly speeds up bundle runtime because a) chunks can be
      // cached by node (e.g., within the `require` infrastructure) and b) we
      // won't `require` any chunks not needed by the command run by the user.
      // It also reduces the total bundle size since chunks can be shared
      // between entry points.
      chunks: "all",
      // I chose 5000000 based on anecdotal results on my machine. Limiting
      // the size to 5000000 bytes shaved off a few hundreths of a milisecond.
      // The negative here is creates more chunks. We can likely remove it and
      // let webpack decide with `chunks: all` if we prefer.
      maxSize: 5000000
    }
  },

  externals: [
    // truffle-config uses the original-require module.
    // Here, we leave it as an external, and use the original-require
    // module that's a dependency of Truffle instead.
    /^original-require$/,
    /^mocha$/,
    /^ganache$/,
    // this is the commands portion shared by cli.js and console-child.js
    /^\.\/commands.bundled.js$/,
    /^ts-node$/,
    /^typescript$/,

    // nodejs built in modules
    /^assert$/,
    /^buffer$/,
    /^console$/,
    /^constants$/,
    /^domain$/,
    /^events$/,
    /^http$/,
    /^https$/,
    /^os$/,
    /^path$/,
    /^punycode$/,
    /^process$/,
    /^querystring$/,
    /^stream$/,
    /^_stream_duplex$/,
    /^_stream_passthrough$/,
    /^_stream_readable$/,
    /^_stream_transform$/,
    /^_stream_writable$/,
    /^string_decoder$/,
    /^sys$/,
    /^timers$/,
    /^tty$/,
    /^url$/,
    /^util$/,
    /^vm$/,
    /^zlib$/,

    // all truffle namespaced modules
    /^@truffle\/.+/
  ],

  resolve: {
    alias: {
      "bn.js": path.join(
        __dirname,
        "..",
        "node_modules",
        "bn.js",
        "lib",
        "bn.js"
      ),
      "original-fs": path.join(__dirname, "..", "packages", "core", "nil.js"),
      "scrypt": "js-scrypt",
      "@truffle": path.resolve(__dirname, "..", "packages")
    },
    extensions: [".js", ".jsx", ".json"]
  },

  stats: {
    warnings: false
  },

  plugins: [
    // Put the shebang back on.
    new BannerPlugin({ banner: "#!/usr/bin/env node\n", raw: true }),

    new ProgressPlugin(),

    // Make web3 1.0 packable
    new IgnorePlugin({ resourceRegExp: /^electron$/ })
  ]
};

export default config;
