var fs = require('fs');

module.exports = {
  build: {
    "index.html": "index.html",
    "app.js": [
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/app.css"
    ],
    "images/": "images/"
  },
  deploy: fs.readdirSync('contracts').map(function(c) { return c.replace(/\.sol$/i, '') }),
  rpc: {
    host: "localhost",
    port: 8545
  }
};
