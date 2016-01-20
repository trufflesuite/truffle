"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var factory = function factory(Pudding) {
  // Inherit from Pudding. The dependency on Babel sucks, but it's
  // the easiest way to extend a Babel-based class. Note that the
  // resulting .js file does not have a dependency on Babel.

  var TestWithConstructor = function (_Pudding) {
    _inherits(TestWithConstructor, _Pudding);

    function TestWithConstructor() {
      _classCallCheck(this, TestWithConstructor);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(TestWithConstructor).apply(this, arguments));
    }

    return TestWithConstructor;
  }(Pudding);

  ;

  // Set up specific data for this class.
  TestWithConstructor.abi = [{ "inputs": [{ "name": "id", "type": "address" }, { "name": "set", "type": "uint256[]" }], "type": "constructor" }];
  TestWithConstructor.binary = "60606040526040516026380380602683390160405260068060206000396000f3606060405200";

  if ("0x33c42800d2dedc92e5d247006ba7ee5ab4bb40de" != "") {
    TestWithConstructor.address = "0x33c42800d2dedc92e5d247006ba7ee5ab4bb40de";

    // Backward compatibility; Deprecated.
    TestWithConstructor.deployed_address = "0x33c42800d2dedc92e5d247006ba7ee5ab4bb40de";
  }

  TestWithConstructor.generated_with = "1.1.0";
  TestWithConstructor.contract_name = "TestWithConstructor";

  return TestWithConstructor;
};

// Nicety for Node.
factory.load = factory;

if (typeof module != "undefined" && typeof module.exports != "undefined") {
  module.exports = factory;
} else {
  // There will only be one version of Pudding in the browser,
  // and we can use that.
  window.TestWithConstructor = factory;
}