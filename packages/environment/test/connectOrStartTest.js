const assert = require("chai").assert;
const Develop = require("../develop");

describe("connectOrStart test network", async function () {
  const ipcOptions = { network: "test" };
  const ganacheOptions = {
    host: "127.0.0.1",
    network_id: 666,
    port: 6969
  };
  const defaultSolidityLogDisplayPrefix = "";

  it("starts Ganache when no Ganache instance is running", async function () {
    let connection;
    try {
      connection = await Develop.connectOrStart(
        ipcOptions,
        ganacheOptions,
        defaultSolidityLogDisplayPrefix
      );
      assert.isTrue(connection.started, "A new Ganache server did not spin up");
      assert.isFunction(connection.disconnect, "disconnect is not a function");
    } finally {
      if (connection) {
        connection.disconnect();
      }
    }
  });

  it("connects to an established Ganache instance", async function () {
    let connectionOneDisconnect, connectionTwo;
    let spawnedGanache;

    try {
      //Establish IPC Ganache service
      spawnedGanache = await Develop.start(ipcOptions.network, ganacheOptions);
      connectionOneDisconnect = await Develop.connect({
        ipcOptions: {
          ...ipcOptions,
          retry: true
        },
        defaultSolidityLogDisplayPrefix
      });

      //Test
      connectionTwo = await Develop.connectOrStart(
        ipcOptions,
        ganacheOptions,
        defaultSolidityLogDisplayPrefix
      );

      //Validate
      assert.isFalse(connectionTwo.started);
    } finally {
      //Cleanup IPC2
      if (connectionTwo.disconnect) {
        connectionTwo.disconnect();
      }
      //Cleanup IPC1
      if (connectionOneDisconnect) {
        connectionOneDisconnect();
      }
      //Signal Ganache Process to exit
      process.kill(spawnedGanache.pid, "SIGHUP");
      //Resolve on confirmation of process exit
      await new Promise(resolve => spawnedGanache.on("exit", () => resolve()));
    }
  });
});
