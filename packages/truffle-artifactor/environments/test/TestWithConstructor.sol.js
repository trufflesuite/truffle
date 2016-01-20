"use strict";

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var factory = function factory(Pudding) {
  // Inherit from Pudding. The dependency on Babel sucks, but it's
  // the easiest way to extend a Babel-based class. Note that the
  // resulting .js file does not have a dependency on Babel.

  var TestWithConstructor = (function (_Pudding) {
    _inherits(TestWithConstructor, _Pudding);

    function TestWithConstructor() {
      _classCallCheck(this, TestWithConstructor);

      _get(Object.getPrototypeOf(TestWithConstructor.prototype), "constructor", this).apply(this, arguments);
    }

    return TestWithConstructor;
  })(Pudding);

  ;

  // Set up specific data for this class.
  TestWithConstructor.abi = [{ "inputs": [{ "name": "id", "type": "address" }, { "name": "set", "type": "uint256[]" }], "type": "constructor" }];
  TestWithConstructor.binary = "60606040526040516026380380602683390160405260068060206000396000f3606060405200";

  if ("0xf76e9b9abe44dd8bb927ceb4ec72d54692e3e6b6" != "") {
    TestWithConstructor.address = "0xf76e9b9abe44dd8bb927ceb4ec72d54692e3e6b6";

    // Backward compatibility; Deprecated.
    TestWithConstructor.deployed_address = "0xf76e9b9abe44dd8bb927ceb4ec72d54692e3e6b6";
  }

  TestWithConstructor.generated_with = "1.0.3";
  TestWithConstructor.contract_name = "TestWithConstructor";

  return TestWithConstructor;
};

// Nicety for Node.
factory.load = factory;

if (typeof module != "undefined") {
  module.exports = factory;
} else {
  // There will only be one version of Pudding in the browser,
  // and we can use that.
  window.TestWithConstructor = factory;
}