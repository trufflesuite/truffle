var Ajv = require("ajv");
var abiSchema = require("../spec/abi.spec.json");
var assert = require("assert");


describe("ABI Schema", function() {
  var validate;

  beforeEach("reset validator", function() {
    var ajv = new Ajv({ useDefaults: true });
    validate = ajv.compile(abiSchema);
  });

  describe("event definition", function() {
    it("validates with all fields valid", function() {
      var abi = [{
        "type": "event",
        "name": "ButtonPressed",
        "inputs": [{
          "name": "button",
          "type": "uint256",
          "indexed": true
        }],
        "anonymous": false
      }];

      assert(validate(abi));
    });

    it("cannot omit type", function() {
      var abi = [{
        "name": "ButtonPressed",
        "inputs": [{
          "name": "button",
          "type": "uint256",
          "indexed": true
        }],
        "anonymous": false
      }];

      assert(!validate(abi));
    });

    it("cannot omit name", function() {
      var abi = [{
        "type": "event",
        "inputs": [{
          "name": "button",
          "type": "uint256",
          "indexed": false
        }],
        "anonymous": false
      }];

      assert(!validate(abi));
    });

    it("cannot omit inputs", function() {
      var abi = [{
        "type": "event",
        "name": "ButtonPressed",
        "anonymous": false
      }];

      assert(!validate(abi));
    });

    it("cannot omit anonymous", function() {
      var abi = [{
        "type": "event",
        "name": "ButtonPressed",
        "inputs": [{
          "name": "button",
          "type": "uint256",
          "indexed": true
        }]
      }];

      assert(!validate(abi));
    });
  });
  describe("normal function definition", function() {
    it("can omit type, outputs, and payable", function() {
      var abi = [{
        "name": "press",
        "inputs": [{
          "name": "button",
          "type": "uint256"
        }],
        "constant": false
      }];

      assert(validate(abi));
      assert.equal(abi[0].type, "function");
      assert.equal(abi[0].payable, false);
      assert.deepEqual(abi[0].outputs, []);
    });

    it("cannot omit name", function() {
      var abi = [{
        "type": "function",
        "outputs": [],
        "payable": true,
        "inputs": [],
        "constant": false
      }];

      assert(!validate(abi));
    });

    it("cannot omit inputs", function() {
      var abi = [{
        "name": "pressButton",
        "type": "function",
        "outputs": [],
        "payable": true,
        "constant": false
      }];

      assert(!validate(abi));
    });

    it("cannot omit constant", function() {
      var abi = [{
        "name": "pressButton",
        "type": "function",
        "inputs": [],
        "outputs": [],
        "payable": true
      }];

      assert(!validate(abi));
    });
  });

  describe("constructor function definition", function() {
    it("can omit payable", function() {
      var abi = [{
        "type": "constructor",
        "inputs": [{
          "name": "button",
          "type": "uint256"
        }]
      }];

      var valid = validate(abi);
      assert(valid);
      assert.equal(abi[0].payable, false);
    });

    it("cannot include name", function() {
      var abi = [{
        "name": "ButtonPresser",
        "type": "constructor",
        "inputs": [{
          "name": "button",
          "type": "uint256"
        }]
      }];

      assert(!validate(abi));
    });

    it("cannot include outputs", function() {
      var abi;

      abi = [{
        "type": "constructor",
        "inputs": [{
          "name": "button",
          "type": "uint256"
        }],
        "outputs": [{
          "name": "amount",
          "type": "uint256"
        }]
      }];
      assert(!validate(abi));

      abi = [{
        "type": "constructor",
        "inputs": [{
          "name": "button",
          "type": "uint256"
        }],
        "outputs": []
      }];
      assert(!validate(abi));
    });

    it("cannot omit inputs", function() {
      var abi = [{
        "type": "constructor",
        "payable": true
      }];

      assert(!validate(abi));
    });

    it("cannot include constant", function() {
      var abi = [{
        "type": "constructor",
        "inputs": [{
          "name": "button",
          "type": "uint256"
        }],
        "constant": false
      }];
      assert(!validate(abi));
    });
  });

  describe("fallback function definition", function() {
    it("can omit payable", function() {
      var abi = [{
        "type": "fallback",
        "constant": false
      }];

      var valid = validate(abi);
      assert(valid);
      assert.equal(abi[0].payable, false);
    });

    it("cannot include name", function() {
      var abi = [{
        "type": "fallback",
        "constant": false,
        "name": "default",
      }];

      assert(!validate(abi));
    });

    it("cannot include outputs", function() {
      var abi;

      abi = [{
        "type": "fallback",
        "constant": false,
        "outputs": [{
          "name": "amount",
          "type": "uint256"
        }]
      }];
      assert(!validate(abi));

      abi = [{
        "type": "fallback",
        "constant": false,
        "outputs": []
      }];
      assert(!validate(abi));
    });

    it("cannot include inputs", function() {
      var abi = [{
        "type": "fallback",
        "payable": true,
        "inputs": [{
          "name": "arg",
          "type": "uint256"
        }]
      }];

      assert(!validate(abi));
    });

    it("can omit constant", function() {
      var abi = [{
        "type": "fallback",
        "payable": true
      }];

      assert(validate(abi));
    });
  });
});
