var SolidityParser = require("solidity-parser");
var fs = require("fs");

var SolidityUtils = {
  // Takes in a path to a file, an abi, a contract name and a callback,
  // and will return an abi that's ordered in the same way the functions
  // exist within the solidity source file.
  ordered_abi: function(file, abi, contract_name, callback) {
    fs.readFile(file, {encoding: "utf8"}, function(err, body) {
      if (err) return callback(err);

      var ordered_function_names = [];
      var ordered_functions = [];

      var ast = SolidityParser.parse(body);
      var contract_definition;

      for (var i = 0; i < ast.body.length; i++) {
        var definition = ast.body[i];

        if (definition.type != "ContractStatement") continue;

        if (definition.name == contract_name) {
          contract_definition = definition;
          break;
        }
      }

      if (!contract_definition) return callback(null, abi);
      if (!contract_definition.body) return callback(null, abi);

      contract_definition.body.forEach(function(statement) {
        if (statement.type == "FunctionDeclaration") {
          ordered_function_names.push(statement.name);
        }
      });

      // Put function names in a hash with their order, lowest first, for speed.
      var functions_to_remove = ordered_function_names.reduce(function(obj, value, index) {
        obj[value] = index;
        return obj;
      }, {});

      // Filter out functions from the abi
      var function_definitions = abi.filter(function(item) {
        return functions_to_remove[item.name] != null;
      });

      // Sort removed function defintions
      function_definitions = function_definitions.sort(function(item_a, item_b) {
        var a = functions_to_remove[item_a.name];
        var b = functions_to_remove[item_b.name];

        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
      });

      // Create a new ABI, placing ordered functions at the end.
      var newABI = [];
      abi.forEach(function(item) {
        if (functions_to_remove[item.name] != null) return;
        newABI.push(item);
      });

      // Now pop the ordered functions definitions on to the end of the abi..
      Array.prototype.push.apply(newABI, function_definitions);

      callback(null, newABI);
    })
  },

  getCharacterOffsetToLineAndColumnMapping: function(source) {
    var mapping = [];

    source = source.split("")

    var line = 0;
    var column = 0;

    source.forEach(function(character) {
      if (character == "\n") {
        line += 1;
        column = -1;

        mapping.push({
          line: line,
          column: 0
        });
      } else {
        mapping.push({
          line: line,
          column: column
        });
      }

      column += 1;
    });

    return mapping;
  },

  getHumanReadableSourceMap: function(sourceMap) {
    var map = sourceMap.split(';');

    var last = {};

    return map.map(function(current) {
      var ret = {
        start: last.start,
        length: last.length,
        file: last.file,
        jump: last.jump
      };

      current = current.split(':');

      if (current[0] && current[0] !== '-1' && current[0].length) {
        ret.start = parseInt(current[0])
      }
      if (current[1] && current[1] !== '-1' && current[1].length) {
        ret.length = parseInt(current[1])
      }
      if (current[2] /*&& current[2] !== '-1'*/ && current[2].length) {
        ret.file = parseInt(current[2])
      }
      if (current[3] && current[3].length) {
        ret.jump = current[3]
      }

      last = ret;

      return ret;
    });
  }
};

module.exports = SolidityUtils;
