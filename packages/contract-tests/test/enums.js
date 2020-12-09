var assert = require("chai").assert;
var util = require("./util");

describe("Enumerations", function () {
  var Example;

  before(async function () {
    this.timeout(10000);

    Example = await util.createExample();
  });

  it("Sets up enumeration objects on contracts", async function () {
    const expected = {
      ExampleZero: 0,
      ExampleOne: 1,
      ExampleTwo: 2
    };
    assert.deepEqual(Example.enums.ExampleEnum, expected);
    assert.deepEqual(Example.ExampleEnum, expected);
  });
});
