var debug = require("debug")("solidity-utils");

var SolidityUtils = {
  getCharacterOffsetToLineAndColumnMapping: function(source) {
    var mapping = [];

    source = source.split("");

    var line = 0;
    var column = 0;

    source.forEach(function(character) {
      if (character === "\n") {
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
    const instructions = sourceMap.split(";");

    let processedInstruction = {}; //persists across instructions for when info doesn't change
    let processedSourceMap = [];

    //JS doesn't have scan, so we'll do this scan manually
    for (let instruction of instructions) {
      let splitInstruction = instruction.split(":");

      //note: if(splitInstruction[i]) checks both that there are
      //at least that many fields, and that that particular field
      //is nonempty

      if (splitInstruction[0] && splitInstruction[0] !== "-1") {
        processedInstruction.start = parseInt(splitInstruction[0]);
      }

      if (splitInstruction[1] && splitInstruction[1] !== "-1") {
        processedInstruction.length = parseInt(splitInstruction[1]);
      }

      if (splitInstruction[2]) {
        processedInstruction.file = parseInt(splitInstruction[2]);
      }

      if (splitInstruction[3]) {
        processedInstruction.jump = splitInstruction[3];
      }

      if (splitInstruction[4]) {
        processedInstruction.modifierDepth = parseInt(splitInstruction[4]);
      }

      //we need to clone before pushing so that the array won't contain a
      //bunch of copies of the same thing.  unfortunately, we don't have
      //babel here, so we need to clone a bit manually.
      let clonedProcessedInstruction = {
        start: processedInstruction.start,
        length: processedInstruction.length,
        file: processedInstruction.file,
        jump: processedInstruction.jump,
        modifierDepth: processedInstruction.modifierDepth
      };

      processedSourceMap.push(clonedProcessedInstruction);
    }

    return processedSourceMap;
  }
};

module.exports = SolidityUtils;
