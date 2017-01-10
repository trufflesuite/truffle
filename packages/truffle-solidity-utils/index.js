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

  }
};

module.exports = SolidityUtils;
