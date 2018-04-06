var assert = require("chai").assert;
var BigNumber = require("bignumber.js");
var temp = require("temp").track();
var path = require("path");
var fs = require("fs");
var util = require('./util');
var contract = require("../");

describe("Events", function() {
  var Example;
  var accounts;
  var network_id;
  var web3;
  var providerOptions = {vmErrorsOnRPCResponse: false};

  before(function() {
    this.timeout(10000);

    Example = util.createExample();

    return util
      .setUpProvider(Example, providerOptions)
      .then(result => {
        web3 = result.web3;
        accounts = result.accounts;
      });
  });

  after(() => temp.cleanupSync());

  it('should expose the "on" handler / format event correctly', function(done){
    Example.new(1).then(example => {
      const event = example.ExampleEvent()

      event.on('data', function(data){
        assert.equal("ExampleEvent", data.event);
        assert.equal(accounts[0], data.args._from);
        assert.equal(8, data.args.num); // 8 is a magic number inside Example.sol
        this.removeAllListeners();
        done();
      });

      example.triggerEvent();
    });
  });

  it('should expose the "once" handler', function(done){
    Example.new(1).then(example => {
      const event = example.ExampleEvent()

      event.once('data', function(data){
        assert.equal("ExampleEvent", data.event);
        assert.equal(accounts[0], data.args._from);
        assert.equal(8, data.args.num); // 8 is a magic number inside Example.sol
        this.removeAllListeners();
        done();
      });

      example.triggerEvent();
    });
  })

  // Emitter is firing twice for each event. :/
  it('should be possible to listen for events with a callback', function(done){
    let finished = false;
    const callback = (err, event) => {
      assert.equal("ExampleEvent", event.event);
      assert.equal(accounts[0], event.args._from);
      assert.equal(8, event.args.num);
      if (!finished){
        finished = true;
        done();
      }
    }

    Example.new(1).then(example => {
      example.ExampleEvent(callback);
      example.triggerEvent();
    })
  });

  // Emitter is firing twice for each event. :/
  it('should fire repeatedly', async function(){
    let emitter;
    let counter = 0;
    const example = await Example.new(1)

    example
      .ExampleEvent()
      .on('data', function(data){
        emitter = this;
        counter++
      });

    await example.triggerEvent();
    await example.triggerEvent();
    await example.triggerEvent();

    assert(counter >= 3, 'emitter should have fired repeatedly');
    emitter.removeAllListeners();
  });
});
