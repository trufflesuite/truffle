const Ganache = require("ganache-core");
const Web3 = require("web3");
const Web3Shim = require("../lib/web3-shim");
const assert = require("assert");
const BN = require("bn.js");

const genesisBlockTime = new Date();
const port = 12345;

async function prepareGanache(quorumEnabled) {
  return new Promise((resolve, reject) => {
    const server = Ganache.server({
      time: genesisBlockTime
    });
    server.listen(port, err => {
      if (err) reject(err);

      web3Shim = new Web3Shim({
        provider: new Web3.providers.HttpProvider(`http://127.0.0.1:${port}`),
        networkType: quorumEnabled ? "quorum" : "ethereum"
      });
      resolve({
        server,
        web3Shim
      });
    });
  });
}

describe("Quorum getBlock Overload", () => {
  it("recovers block timestamp as hexstring instead of number w/ quorum=true", async () => {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(true);
        const block = await preparedGanache.web3Shim.eth.getBlock(0);
        const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
        assert.strictEqual(
          block.timestamp,
          "0x" + expectedBlockTime.toString(16)
        );
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });

  it("recovers block timestamp as number w/ quorum=false", async () => {
    return new Promise(async (resolve, reject) => {
      let preparedGanache;
      try {
        preparedGanache = await prepareGanache(false);
        const block = await preparedGanache.web3Shim.eth.getBlock(0);
        const expectedBlockTime = new BN(genesisBlockTime.getTime()).divn(1000);
        assert.strictEqual(block.timestamp, expectedBlockTime.toNumber());
        preparedGanache.server.close(resolve);
      } catch (e) {
        preparedGanache.server.close(() => {
          reject(e);
        });
      }
    });
  });
});
