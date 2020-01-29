var assert = require("chai").assert;
var util = require("./util");

describe("Events", function() {
  var Example;
  var accounts;
  var web3;
  var providerOptions = { vmErrorsOnRPCResponse: false };

  before(async function() {
    this.timeout(10000);

    Example = await util.createExample();

    return util.setUpProvider(Example, providerOptions).then(result => {
      web3 = result.web3;
      accounts = result.accounts;
    });
  });

  it('should expose the "on" handler / format event correctly', function(done) {
    Example.new(1).then(example => {
      const event = example.ExampleEvent();

      event.on("data", function(data) {
        assert.equal("ExampleEvent", data.event);
        assert.equal(accounts[0], data.args._from);
        assert.equal(8, data.args.num); // 8 is a magic number inside Example.sol
        this.removeAllListeners();
        done();
      });

      example.triggerEvent();
    });
  });

  it('should expose the "once" handler', function(done) {
    Example.new(1).then(example => {
      const event = example.ExampleEvent();

      event.once("data", function(data) {
        assert.equal("ExampleEvent", data.event);
        assert.equal(accounts[0], data.args._from);
        assert.equal(8, data.args.num); // 8 is a magic number inside Example.sol
        this.removeAllListeners();
        done();
      });

      example.triggerEvent();
    });
  });

  it("should be possible to listen for events with a callback", function(done) {
    const callback = (err, data) => {
      assert.equal("ExampleEvent", data.event);
      assert.equal(accounts[0], data.args._from);
      assert.equal(8, data.args.num);
      done();
    };

    Example.new(1).then(example => {
      example.ExampleEvent(callback);
      example.triggerEvent();
    });
  });

  it("event emitter should fire repeatedly (without duplicates)", async function() {
    let emitter;
    let counter = 0;
    const example = await Example.new(1);

    example.ExampleEvent().on("data", function() {
      emitter = this;
      counter++;
    });

    await example.triggerEventWithArgument(1);
    await example.triggerEventWithArgument(2);
    await example.triggerEventWithArgument(3);

    assert(counter === 3, "emitter should have fired repeatedly");
    emitter.removeAllListeners();
  });

  it("event callback should fire repeatedly (without duplicates)", async function() {
    let counter = 0;
    let duplicate = false;
    const example = await Example.new(1);

    example.ExampleEvent(function(err, res) {
      if (res === false) duplicate = true;
      counter++;
    });
    await example.triggerEventWithArgument(1);
    await example.triggerEventWithArgument(2);
    await example.triggerEventWithArgument(3);

    assert(counter === 3, "callback should have been called repeatedly");
    assert(duplicate === false, "must not fire duplicates as false result");
  });

  it("should listen for `allEvents`", async function() {
    let emitter;
    const events = [];
    const eventNames = [];
    const signatures = ["ExampleEvent", "SpecialEvent"];
    const example = await Example.new(1);

    example.allEvents().on("data", function(data) {
      events.push(data);
      data.event && eventNames.push(data.event);
      emitter = this;
    });

    await example.triggerEvent();
    await example.triggerSpecialEvent();

    assert(
      eventNames.includes(signatures[0]),
      `Expected to hear ${signatures[0]}`
    );
    assert(
      eventNames.includes(signatures[1]),
      `Expected to hear ${signatures[1]}`
    );

    // Make sure we're formattingfor backwards compatibility
    assert.equal(events[0].args._from, accounts[0]);
    assert.equal(events[0].args.num, 8);

    emitter.removeAllListeners();
  });

  it("should `getPastEvents`", async function() {
    const signatures = ["ExampleEvent", "SpecialEvent"];
    const example = await Example.new(1);
    const options = { fromBlock: 0, toBlock: "latest" };

    await example.triggerEvent();
    await example.triggerEvent();

    await example.triggerSpecialEvent();
    await example.triggerSpecialEvent();

    const exampleEvent = await example.getPastEvents("ExampleEvent", options);
    const specialEvent = await example.getPastEvents("SpecialEvent", options);

    assert(exampleEvent.length === 2);
    assert(exampleEvent[0].event === signatures[0]);
    assert(exampleEvent[1].event === signatures[0]);

    // Make sure we're formatting for backwards compatibility
    assert.equal(exampleEvent[0].args._from, accounts[0]);
    assert.equal(exampleEvent[0].args.num, 8);

    assert(specialEvent.length === 2);
    assert(specialEvent[0].event === signatures[1]);
    assert(specialEvent[1].event === signatures[1]);
  });

  // Event signature is:
  // NumberEvent(int numA, int indexed numB, address addrC, uint numD, uint);
  it("should reformat numbers in events to BN by default", function(done) {
    Example.new(1).then(example => {
      const event = example.NumberEvent();

      event.once("data", function(data) {
        const args = data.args;

        assert(web3.utils.isBN(args[0])); // int named
        assert(web3.utils.isBN(args[1])); // int named, indexed

        assert(!web3.utils.isBN(args[2])); // Address

        assert(web3.utils.isBN(args[3])); // uint named
        assert(web3.utils.isBN(args[4])); // uint unnamed

        assert(web3.utils.isBN(args.numA));
        assert(web3.utils.isBN(args.numB));

        assert(!web3.utils.isBN(args.addressC));

        assert(web3.utils.isBN(args.numD));

        assert(args.numA.toNumber() === 5);
        assert(args.numD.toNumber() === 55);

        this.removeAllListeners();
        done();
      });

      example.triggerNumberEvent(5, 7, accounts[0], 55, 77);
    });
  });
});
