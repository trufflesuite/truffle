var fs = require("fs");

var SolidityUtils = {

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
