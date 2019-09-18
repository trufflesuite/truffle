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
      var abi = [
        {
          type: "event",
          name: "ButtonPressed",
          inputs: [
            {
              name: "button",
              type: "uint256",
              indexed: true
            }
          ],
          anonymous: false
        }
      ];

      assert(validate(abi));
    });

    it("cannot omit type", function() {
      var abi = [
        {
          name: "ButtonPressed",
          inputs: [
            {
              name: "button",
              type: "uint256",
              indexed: true
            }
          ],
          anonymous: false
        }
      ];

      assert(!validate(abi));
    });

    it("cannot omit name", function() {
      var abi = [
        {
          type: "event",
          inputs: [
            {
              name: "button",
              type: "uint256",
              indexed: false
            }
          ],
          anonymous: false
        }
      ];

      assert(!validate(abi));
    });

    it("cannot omit inputs", function() {
      var abi = [
        {
          type: "event",
          name: "ButtonPressed",
          anonymous: false
        }
      ];

      assert(!validate(abi));
    });

    it("cannot omit anonymous", function() {
      var abi = [
        {
          type: "event",
          name: "ButtonPressed",
          inputs: [
            {
              name: "button",
              type: "uint256",
              indexed: true
            }
          ]
        }
      ];

      assert(!validate(abi));
    });
  });
  describe("normal function definition", function() {
    it("can omit type, outputs, constant, and payable", function() {
      var abi = [
        {
          name: "press",
          inputs: [
            {
              name: "button",
              type: "uint256"
            }
          ],
          stateMutability: "nonpayable"
        }
      ];

      assert(validate(abi));
      assert.equal(abi[0].type, "function");
      assert.equal(abi[0].stateMutability, "nonpayable");
      assert.deepEqual(abi[0].outputs, []);
    });

    it("cannot omit name", function() {
      var abi = [
        {
          type: "function",
          outputs: [],
          inputs: [],
          stateMutability: "nonpayable"
        }
      ];

      assert(!validate(abi));
    });

    it("cannot omit inputs", function() {
      var abi = [
        {
          name: "pressButton",
          type: "function",
          outputs: [],
          stateMutability: "nonpayable"
        }
      ];

      assert(!validate(abi));
    });
  });

  describe("constructor function definition", function() {
    it("can omit constant, and payable", function() {
      var abi = [
        {
          type: "constructor",
          inputs: [
            {
              name: "button",
              type: "uint256"
            }
          ],
          stateMutability: "nonpayable"
        }
      ];

      assert(validate(abi));
      assert.equal(abi[0].type, "constructor");
      assert.equal(abi[0].stateMutability, "nonpayable");
      assert.deepEqual(abi[0].outputs, []);
    });

    it("cannot include name", function() {
      var abi = [
        {
          name: "ButtonPresser",
          type: "constructor",
          inputs: [
            {
              name: "button",
              type: "uint256"
            }
          ],
          stateMutability: "nonpayable"
        }
      ];

      assert(!validate(abi));
    });

    it("cannot include outputs", function() {
      var abi;

      abi = [
        {
          type: "constructor",
          inputs: [
            {
              name: "button",
              type: "uint256"
            }
          ],
          outputs: [
            {
              name: "amount",
              type: "uint256"
            }
          ],
          stateMutability: "nonpayable"
        }
      ];
      assert(!validate(abi));

      abi = [
        {
          type: "constructor",
          inputs: [
            {
              name: "button",
              type: "uint256"
            }
          ],
          outputs: [],
          stateMutability: "nonpayable"
        }
      ];
      assert(!validate(abi));
    });

    it("cannot omit inputs", function() {
      var abi = [
        {
          type: "constructor",
          stateMutability: "nonpayable"
        }
      ];

      assert(!validate(abi));
    });
  });

  describe("fallback function definition", function() {
    it("can omit constant and payable", function() {
      var abi = [
        {
          type: "fallback",
          stateMutability: "nonpayable"
        }
      ];

      var valid = validate(abi);
      assert(valid);
      assert.equal(abi[0].stateMutability, "nonpayable");
    });

    it("cannot include name", function() {
      var abi = [
        {
          type: "fallback",
          name: "default",
          stateMutability: "nonpayable"
        }
      ];

      assert(!validate(abi));
    });

    it("cannot include outputs", function() {
      var abi;

      abi = [
        {
          type: "fallback",
          stateMutability: "nonpayable",
          outputs: [
            {
              name: "amount",
              type: "uint256"
            }
          ]
        }
      ];
      assert(!validate(abi));

      abi = [
        {
          type: "fallback",
          stateMutability: "nonpayable",
          outputs: []
        }
      ];
      assert(!validate(abi));
    });

    it("cannot include inputs", function() {
      var abi = [
        {
          type: "fallback",
          stateMutability: "payable",
          inputs: [
            {
              name: "arg",
              type: "uint256"
            }
          ]
        }
      ];

      assert(!validate(abi));
    });
  });
});
