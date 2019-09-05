const analytics = {
  send: function(eventObject) {
    let analyticsPath;
    const path = require("path");
    if (typeof BUNDLE_ANALYTICS_FILENAME !== "undefined") {
      analyticsPath = path.join(__dirname, BUNDLE_ANALYTICS_FILENAME);
    } else {
      analyticsPath = path.join(__dirname, "main.js");
    }

    const cp = require("child_process");
    const child = cp.fork(analyticsPath, { silent: true });
    child.send(eventObject);
  }
};

module.exports = analytics;
