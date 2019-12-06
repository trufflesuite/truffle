const assert = require("chai").assert;
const safeEval = require("safe-eval");
const DebugUtils = require("../index");
const BN = require("bn.js");

describe("Utils", function() {
  describe("cleanConstructors()", function() {
    it("Removes spurious undefined constructors after safeEval", function() {
      let context = { a: { value: 107 } };
      let expr = "a";
      let result = safeEval(expr, context);
      //before we check the removal, let's check that there's something to
      //remove
      assert(result.hasOwnProperty("constructor"));
      let cleanedResult = DebugUtils.cleanConstructors(result);
      //now we'll check that it was removed
      assert(!cleanedResult.hasOwnProperty("constructor"));
    });
    it("Leaves BNs recognizable", function() {
      let context = { a: new BN(107) };
      let expr = "a";
      let result = safeEval(expr, context);
      let cleanedResult = DebugUtils.cleanConstructors(result);
      assert(BN.isBN(cleanedResult));
    });
    it("Leaves arrays recognizable", function() {
      let context = { a: [107] };
      let expr = "a";
      let result = safeEval(expr, context);
      let cleanedResult = DebugUtils.cleanConstructors(result);
      assert.isArray(cleanedResult);
    });
    it("Doesn't choke on circular objects", function() {
      let circular = { x: 107, children: [] };
      circular.children.push(circular);
      let context = { circular };
      let expr = "circular";
      let result = safeEval(expr, context);
      DebugUtils.cleanConstructors(result);
      //no need for an assert, if we finish without crashing we're good
    });
  });
});
