if (process.env.NODE_ENV === "production") {
  module.exports = require("./production");
} else if (process.env.NODE_ENV === "test") {
  module.exports = require("./test");
} else {
  module.exports = require("./development");
}
