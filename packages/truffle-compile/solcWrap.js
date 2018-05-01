/**
 * This is a truncated version of soljs's wrapper for soljson.js (the solc js file available
 * at solc-bin. Using this allows us to avoid requiring solc twice, cutting ~2s off the load time)
 */

var assert = require('assert');

function solcWrap (soljson) {
  var compileJSON = soljson.cwrap('compileJSON', 'string', ['string', 'number']);
  var compileJSONMulti = null;
  if ('_compileJSONMulti' in soljson) {
    compileJSONMulti = soljson.cwrap('compileJSONMulti', 'string', ['string', 'number']);
  }
  var compileJSONCallback = null;
  var compileStandard = null;
  if (('_compileJSONCallback' in soljson) || ('_compileStandard' in soljson)) {
    var copyString = function (str, ptr) {
      var length = soljson.lengthBytesUTF8(str);
      var buffer = soljson._malloc(length + 1);
      soljson.stringToUTF8(str, buffer, length + 1);
      soljson.setValue(ptr, buffer, '*');
    };
    var wrapCallback = function (callback) {
      assert(typeof callback === 'function', 'Invalid callback specified.');
      return function (path, contents, error) {
        var result = callback(soljson.Pointer_stringify(path));
        if (typeof result.contents === 'string') {
          copyString(result.contents, contents);
        }
        if (typeof result.error === 'string') {
          copyString(result.error, error);
        }
      };
    };

    // This calls compile() with args || cb
    var runWithReadCallback = function (readCallback, compile, args) {
      if (readCallback === undefined) {
        readCallback = function (path) {
          return {
            error: 'File import callback not supported'
          };
        };
      }
      var cb = soljson.Runtime.addFunction(wrapCallback(readCallback));
      var output;
      try {
        args.push(cb);
        output = compile.apply(undefined, args);
      } catch (e) {
        soljson.Runtime.removeFunction(cb);
        throw e;
      }
      soljson.Runtime.removeFunction(cb);
      return output;
    };

    var compileInternal = soljson.cwrap('compileJSONCallback', 'string', ['string', 'number', 'number']);
    compileJSONCallback = function (input, optimize, readCallback) {
      return runWithReadCallback(readCallback, compileInternal, [ input, optimize ]);
    };
    if ('_compileStandard' in soljson) {
      var compileStandardInternal = soljson.cwrap('compileStandard', 'string', ['string', 'number']);
      compileStandard = function (input, readCallback) {
        return runWithReadCallback(readCallback, compileStandardInternal, [ input ]);
      };
    }
  }

  var version = soljson.cwrap('version', 'string', []);

  return {
    compileStandard: compileStandard,
    version: version,
  };
}

module.exports = solcWrap;