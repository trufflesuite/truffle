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
    const connection = await Develop.connectOrStart(ipcOptions, ganacheOptions);
    assert.isTrue(connection.started);
    assert.isFunction(connection.disconnect);
    connection.disconnect();
  });

  it("connects to an established ganache instance", async function () {
    //establish a connection
    const { disconnect: connectionOneDisconnect } =
      await Develop.connectOrStart(ipcOptions, ganacheOptions);

    //invoke the method again
    const { disconnect: connectionTwoDisconnect, started } =
      await Develop.connectOrStart(ipcOptions, ganacheOptions);
    assert.isFalse(started);

    //cleanup
    await connectionOneDisconnect();
    await connectionTwoDisconnect();
  });
});
