if (process.env.NODE_ENV === "test") {
  module.exports = require("./test");
} else {
  module.exports = require("./production");
}
