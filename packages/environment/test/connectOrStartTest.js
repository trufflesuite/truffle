const assert = require("chai").assert;
const Develop = require("../develop");

describe("connectOrStart test network", async function () {
  const ipcOptions = { network: "test" };
  const ganacheOptions = {
    host: "127.0.0.1",
    network_id: 666,
    port: 6969
  };

  it("starts Ganache when no Ganache instance is running", async function () {
    let connection;
    try {
      connection = await Develop.connectOrStart(ipcOptions, ganacheOptions);
      assert.isTrue(connection.started, "A new server did not spin up");
      assert.isFunction(connection.disconnect, "Disconnect is not a function");
    } catch (error) {
      console.log(error);
      assert.fail("Develop.connectOrStart should not have thrown!");
    } finally {
      if (connection) {
        return connection.disconnect();
      }
    }
  });

  it("connects to an established ganache instance", async function () {
    let connectionOneDisconnect, connectionTwoDisconnect;

    try {
      //establish a connection
      connectionOneDisconnect = (
        await Develop.connectOrStart(ipcOptions, ganacheOptions)
      ).disconnect;

      //invoke the method again
      const result = await Develop.connectOrStart(ipcOptions, ganacheOptions);
      connectionTwoDisconnect = result.disconnect;
      assert.isFalse(result.started);
    } catch (error) {
      console.log(error);
      assert.fail("Develop.connectOrStart should not have thrown!");
    } finally {
      //cleanup
      if (connectionOneDisconnect) {
        connectionOneDisconnect();
      }
      if (connectionTwoDisconnect) {
        connectionTwoDisconnect();
      }
    }
  });
});
