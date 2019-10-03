/**
 * Utilities for reformatting web3 outputs
 */
const BigNumber = require("bignumber.js/bignumber");
const web3Utils = require("web3-utils");

/**
 * Converts from string to other number format
 * @param  {String} val    number string returned by web3
 * @param  {String} format name of format to convert to
 * @return {Object|String} converted value
 */
const _convertNumber = function(val, format) {
  const badFormatMsg = `Attempting to convert to unknown number format: ${format}`;

  switch (format) {
    case "BigNumber":
      return new BigNumber(val);
    case "BN":
      return web3Utils.toBN(val);
    case "String":
      return val;
    default:
      throw new Error(badFormatMsg);
  }
};

/**
 * Converts arrays of number strings to other number formats
 * @param  {String[]} arr       number string array returned by web3
 * @param  {String}   format    name of format to convert to
 * @return {Object[]|String[]}  array of converted values
 */
const _convertNumberArray = function(arr, format) {
  return arr.map(item => _convertNumber(item, format));
};

/**
 * Reformats numbers in the result/result-object of a web3 call.
 * Possible forms of `result` are:
 *   - object (with index keys and optionally, named keys)
 *   - array
 *   - single primitive
 * @param  {String|Object|Array} result      web3 call result
 * @param  {Array}               abiSegment  event params OR .call outputs
 * @return {String|Object|Array} reformatted result
 */
const numbers = function(result, abiSegment) {
  const format = this.numberFormat;

  abiSegment.forEach((output, i) => {
    // output is a number type (uint || int);
    if (output.type.includes("int")) {
      // output is an array type
      if (output.type.includes("[")) {
        // result is array
        if (Array.isArray(result)) {
          result = _convertNumberArray(result, format);

          // result is object
        } else {
          // output has name
          if (output.name.length) {
            result[output.name] = _convertNumberArray(
              result[output.name],
              format
            );
          }
          // output will always have an index key
          result[i] = _convertNumberArray(result[i], format);
        }
        //
      } else if (typeof result === "object") {
        // output has name
        if (output.name.length) {
          result[output.name] = _convertNumber(result[output.name], format);
        }

        // output will always have an index key
        result[i] = _convertNumber(result[i], format);
      } else {
        result = _convertNumber(result, format);
      }
    }
  });
  return result;
};

module.exports = {
  numbers: numbers
};
