const debug = require("debug")("solidity-utils");
const CodeUtils = require("@truffle/code-utils");
const Codec = require("@truffle/codec");
const jsonpointer = require("json-pointer");
//NOTE: for some reason using the default export isn't working??
//so we're going to do this the "advanced usage" way...
const { IntervalTree } = require("node-interval-tree");

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
  },

  //sources: array of text sources (must be in order!)
  //binary: raw binary to process.  should not have unresolved links.
  //sourceMap: a processed source map as output by getHumanReadableSourceMap above
  //we... attempt to muddle through.
  getProcessedInstructionsForBinary: function(sources, binary, sourceMap) {
    if (!sources || !binary) {
      return [];
    }
    debug("sourceMap: %O", sourceMap);

    let numInstructions;
    if (sourceMap) {
      numInstructions = sourceMap.length;
    } else {
      //HACK
      numInstructions = (binary.length - 2) / 2;
      //this is actually an overestimate, but that's OK
    }

    //because we might be dealing with a constructor with arguments, we do
    //*not* remove metadata manually
    let instructions = CodeUtils.parseCode(binary, numInstructions);

    if (!sourceMap) {
      // HACK
      // Let's create a source map to use since none exists. This source
      // map maps just as many ranges as there are instructions (or
      // possibly more), and marks them all as being Solidity-internal and
      // not jumps.
      sourceMap = new Array(instructions.length);
      sourceMap.fill({
        start: 0,
        length: 0,
        file: -1,
        jump: "-",
        modifierDepth: "0"
      });
    }

    var lineAndColumnMappings = Object.assign(
      {},
      ...Object.entries(sources).map(([id, source]) => ({
        [id]: SolidityUtils.getCharacterOffsetToLineAndColumnMapping(
          source || ""
        )
      }))
    );

    let primaryFile;
    if (sourceMap[0]) {
      primaryFile = sourceMap[0].file;
    }
    debug("primaryFile %o", primaryFile);

    return instructions
      .map((instruction, index) => {
        // lookup source map by index and add `index` property to
        // instruction
        //

        const instructionSourceMap = sourceMap[index] || {};

        instruction.index = index; //should be fine to modify this

        return {
          instruction,
          instructionSourceMap
        };
      })
      .map(({ instruction, instructionSourceMap }) => {
        // add source map information to instruction, or defaults

        //I think it is also OK to modify instruction here
        ({
          jump: instruction.jump,
          start: instruction.start = 0,
          length: instruction.length = 0,
          file: instruction.file = primaryFile,
          modifierDepth: instruction.modifierDepth = 0
        } = instructionSourceMap);
        const lineAndColumnMapping =
          lineAndColumnMappings[instruction.file] || {};
        instruction.range = {
          start: lineAndColumnMapping[instruction.start] || {
            line: null,
            column: null
          },
          end: lineAndColumnMapping[instruction.start + instruction.length] || {
            line: null,
            column: null
          }
        };

        return instruction;
      });
  },

  //instructions: as output by the function above
  //asts: array of abstract syntax trees for the sources. must be in order!
  //overlapFunctions: an array of functions -- each one corresponding to the AST of the same index --
  //that, given a start index and a length, will search for all nodes in that AST overlapping the
  //given range, and will return an array of objects with fields node and pointer; node should
  //be the corresponding node, and pointer a jsonpointer to it (from the AST root)
  //compilationId: what it says.  the function will work fine without it.
  getFunctionsByProgramCounter: function(
    instructions,
    asts,
    overlapFunctions,
    compilationId
  ) {
    return Object.assign(
      {},
      ...instructions
        .filter(instruction => instruction.name === "JUMPDEST")
        .filter(instruction => instruction.file !== -1)
        //note that the designated invalid function *does* have an associated
        //file, so it *is* safe to just filter out the ones that don't
        .map(instruction => {
          debug("instruction %O", instruction);
          let sourceId = instruction.file;
          let findOverlappingRange = overlapFunctions[sourceId];
          let ast = asts[sourceId];
          if (!ast) {
            //if we can't get the ast... filter it out I guess
            return {};
          }
          let range = SolidityUtils.getSourceRange(instruction);
          let { node, pointer } = SolidityUtils.findRange(
            findOverlappingRange,
            range.start,
            range.length
          );
          if (!pointer) {
            node = ast;
          }
          if (!node || node.nodeType !== "FunctionDefinition") {
            //filter out JUMPDESTs that aren't function definitions...
            //except for the designated invalid function
            let nextInstruction = instructions[instruction.index + 1] || {};
            if (nextInstruction.name === "INVALID") {
              //designated invalid, include it
              return {
                [instruction.pc]: {
                  isDesignatedInvalid: true
                }
              };
            } else {
              //not designated invalid, filter it out
              return {};
            }
          }
          //otherwise, we're good to go, so let's find the contract node and
          //put it all together
          //to get the contract node, we go up twice from the function node;
          //the path from one to the other should have a very specific form,
          //so this is easy
          let contractPointer = pointer.replace(/\/nodes\/\d+$/, "");
          let contractNode = jsonpointer.get(ast, contractPointer);
          return {
            [instruction.pc]: {
              sourceIndex: sourceId,
              compilationId,
              pointer,
              node,
              name: node.name,
              id: node.id,
              mutability: Codec.Ast.Utils.mutability(node),
              contractPointer,
              contractNode,
              contractName: contractNode.name,
              contractId: contractNode.id,
              contractKind: contractNode.contractKind,
              isDesignatedInvalid: false
            }
          };
        })
    );
  },

  getSourceRange: function(instruction = {}) {
    return {
      start: instruction.start || 0,
      length: instruction.length || 0,
      lines: instruction.range || {
        start: {
          line: 0,
          column: 0
        },
        end: {
          line: 0,
          column: 0
        }
      }
    };
  },

  //findOverlappingRange should be as described above
  findRange: function(findOverlappingRange, sourceStart, sourceLength) {
    // find nodes that fully contain requested range,
    // return one with longest pointer
    // (note: returns { range, node, pointer }
    let sourceEnd = sourceStart + sourceLength;
    return findOverlappingRange(sourceStart, sourceLength)
      .filter(({ range }) => sourceStart >= range[0] && sourceEnd <= range[1])
      .reduce(
        (acc, cur) => (cur.pointer.length >= acc.pointer.length ? cur : acc),
        { pointer: "" }
      );
    //note we make sure to bias towards cur (the new value being compared) rather than acc (the old value)
    //so that we don't actually get {pointer: ""} as our result
  },

  //makes the overlap function for an AST
  makeOverlapFunction: function(ast) {
    let tree = new IntervalTree();
    let ranges = SolidityUtils.rangeNodes(ast);
    for (let { range, node, pointer } of ranges) {
      let [start, end] = range;
      //NOTE: we are doing this the "advanced usage" way because the
      //other way isn't working for some reason
      tree.insert({ low: start, high: end, data: { range, node, pointer } });
    }
    return (sourceStart, sourceLength) =>
      //because we're doing this the "advanced usage" way, we have
      //to extract data afterward
      tree
        .search(sourceStart, sourceStart + sourceLength)
        .map(({ data }) => data);
  },

  //for use by makeOverlapFunction
  rangeNodes: function(node, pointer = "") {
    if (node instanceof Array) {
      return [].concat(
        ...node.map((sub, i) =>
          SolidityUtils.rangeNodes(sub, `${pointer}/${i}`)
        )
      );
    } else if (node instanceof Object) {
      let results = [];

      if (node.src !== undefined && node.id !== undefined) {
        //there are some "pseudo-nodes" with a src but no id.
        //these will cause problems, so we want to exclude them.
        //(to my knowledge this only happens with the externalReferences
        //to an InlineAssembly node, so excluding them just means we find
        //the InlineAssembly node instead, which is fine)
        results.push({ pointer, node, range: SolidityUtils.getRange(node) });
      }

      return results.concat(
        ...Object.keys(node).map(key =>
          SolidityUtils.rangeNodes(node[key], `${pointer}/${key}`)
        )
      );
    } else {
      return [];
    }
  },

  getRange: function(node) {
    // src: "<start>:<length>:<_>"
    // returns [start, end]
    let [start, length] = node.src
      .split(":")
      .slice(0, 2)
      .map(i => parseInt(i));

    return [start, start + length];
  }
};

module.exports = SolidityUtils;
