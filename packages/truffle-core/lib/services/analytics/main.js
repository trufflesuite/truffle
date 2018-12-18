const analytics = require("./google.js");

const PROCESS_TIMEOUT = 5000; // ms

console.debug("starting truffle analytics process");

const done = new Promise(accept => {
  setTimeout(accept, PROCESS_TIMEOUT);
  console.debug("timeout set");
});

process.on("message", async eventObject => {
  console.debug("sending event %o", eventObject);
  analytics.sendAnalyticsEvent(eventObject);
  console.debug("(maybe) sent event %o", eventObject);
});

done.then(() => {
  console.debug("timeout reached");
  process.exit(0);
});
