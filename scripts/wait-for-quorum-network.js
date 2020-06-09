const Web3 = require("web3");
const {
  networks: { development: developmentNetworkConfig }
} = require("../packages/truffle/test/sources/migrations/quorum/truffle-config");

/**
 * Retries the given function until it succeeds, given a number of retries and an interval between them.
 * Defaults to retry 5 times with 1 sec in between.
 * @param {Function} fn - Returns a promise
 * @param {Number} retries - Number of retries.
 * @param {Number} interval - Milliseconds between retries.
 * @return {Promise<*>}
 */
async function retry(fn, retries = 5, interval = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries) {
      await new Promise(r => setTimeout(r, interval));
      return retry(fn, retries - 1, interval);
    }
    throw new Error("Max retries reached");
  }
}

const web3 = new Web3();
web3.setProvider(
  `http://${developmentNetworkConfig.host}:${developmentNetworkConfig.port}`
);

console.log("Waiting for the quorum network to be ready...");

retry(web3.eth.getAccounts, (interval = 5000))
  .then(() => console.log("Quorum network ready!"))
  .catch(console.error);
