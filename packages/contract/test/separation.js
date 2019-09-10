var assert = require("chai").assert;
var util = require("./util");

describe("instance-instance / instance-constructor separation", function() {
  var Example;
  var exampleA;
  var exampleB;
  var providerOptions = { vmErrorsOnRPCResponse: false };

  before(async function() {
    this.timeout(10000);

    Example = await util.createExample();

    return util.setUpProvider(Example, providerOptions);
  });

  beforeEach(async () => {
    exampleA = await Example.new(1);
    exampleB = await Example.new(2);
  });

  it("instances should not hear each others events", function(done) {
    const events = [];
    const event = exampleA.ContractAddressEvent();

    event.on("data", evt => {
      events.push(evt);
      if (evt.args._contract === exampleA.address) {
        assert(events.length === 1);
        done();
      }
    });

    exampleB
      .triggerContractAddressEvent()
      .then(() => exampleA.triggerContractAddressEvent())
      .catch(assert.fail);
  });

  it("constructor and instance namespaces should be separate", async function() {
    let isDeployed = Example.isDeployed(); // Constructor method returns boolean
    assert(isDeployed === false);

    isDeployed = await exampleA.isDeployed(); // Contract method returns example.address
    assert(isDeployed === exampleA.address);
  });
});
