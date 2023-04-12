const debug = require("debug")("source-map-utils");
const CodeUtils = require("@truffle/code-utils");
const Codec = require("@truffle/codec");
const Web3Utils = require("web3-utils");
const jsonpointer = require("json-pointer");
const IntervalTree = require("node-interval-tree").default;

var SourceMapUtils = {
  getCharacterOffsetToLineAndColumnMapping: function (source) {
    var mapping = [];

    source = Array.from(source); //note: this will correctly handle
    //surrogate pairs, but there's still the problem of grapheme
    //clusters!  We should do something about that later.

    var line = 0;
    var column = 0;

    source.forEach(function (character) {
      let loc = { line, column };
      if (character === "\n") {
        line += 1;
        column = -1;

        loc = {
          line: line,
          column: 0
        };
      }

      for (let i = 0; i < Buffer.from(character).length; i++) {
        //because our character offsets here are in bytes, we need to
        //pad out the line/column map as per the UTF-8 length of the
        //characters so we're mapping *bytes* to line/columns
        mapping.push(loc);
      }
      column += 1;
    });

    return mapping;
  },

  getHumanReadableSourceMap: function (sourceMap) {
    const instructions = sourceMap.split(";");

    let processedInstruction = {
      start: 0,
      length: 0,
      file: 0
    }; //persists across instructions for when info doesn't change
    let processedSourceMap = [];

    //JS doesn't have scan, so we'll do this scan manually
    for (let instruction of instructions) {
      let splitInstruction = instruction.split(":");

      //note: if(splitInstruction[i]) checks both that there are
      //at least that many fields, and that that particular field
      //is nonempty

      if (splitInstruction[0]) {
        processedInstruction.start = parseInt(splitInstruction[0]);
      }

      if (splitInstruction[1]) {
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
  //if missing, we... attempt to muddle through.
  getProcessedInstructionsForBinary: function (sources, binary, sourceMap) {
    if (!sources || !binary) {
      return [];
    }
    debug("sourceMap: %O", sourceMap);

    let numInstructions;
    if (sourceMap) {
      numInstructions = sourceMap.length;
    }

    //because we might be dealing with a constructor with arguments, we do
    //*not* pass attemptStripMetadata under any circumstances as a safety
    //measure (to prevent accidentally removing some of the *code* as well)
    //(this is pretty unlikely but I'm going to continue to err on the safe
    //side here I figure)
    let instructions = CodeUtils.parseCode(binary, {
      maxInstructionCount: numInstructions
    });

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

    const lineAndColumnMappings = sources.map(source =>
      SourceMapUtils.getCharacterOffsetToLineAndColumnMapping(source || "")
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
        if (instruction.start === -1 && instruction.length === -1) {
          instruction.start = 0;
          instruction.length = 0;
        }
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
  getFunctionsByProgramCounter: function (
    instructions,
    asts,
    overlapFunctions,
    compilationId
  ) {
    return Object.assign(
      {},
      ...instructions
        .filter(instruction => instruction.name === "JUMPDEST")
        .map(instruction => {
          debug("instruction %O", instruction);
          const sourceIndex = instruction.file;
          const findOverlappingRange = overlapFunctions[sourceIndex];
          const ast = asts[sourceIndex];
          //first off, if we can't get the AST, check for designated
          //invalid and if it's not that give up
          //(note that being unable to get the AST includes the case
          //of source index -1; designated invalid has source index
          //-1 in some Solidity versions)
          if (!ast) {
            if (
              SourceMapUtils.isDesignatedInvalid(
                instructions,
                instruction.index,
                overlapFunctions
              )
            ) {
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
          const range = SourceMapUtils.getSourceRange(instruction);
          let { node, pointer } = SourceMapUtils.findRange(
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
            if (
              SourceMapUtils.isDesignatedInvalid(
                instructions,
                instruction.index,
                overlapFunctions,
                node
              )
            ) {
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
          if (contractNode.nodeType !== "ContractDefinition") {
            //if it's a free function, there is no contract pointer or contract node
            contractPointer = null;
            contractNode = null;
          }
          return {
            [instruction.pc]: {
              sourceIndex,
              compilationId,
              //note: we're assuming that functions in generated sources are never pointed to
              pointer,
              node,
              name: node.name,
              id: node.id,
              mutability: Codec.Ast.Utils.mutability(node),
              contractPointer,
              contractNode,
              contractName: contractNode ? contractNode.name : null,
              contractId: contractNode ? contractNode.id : null,
              contractKind: contractNode ? contractNode.contractKind : null,
              contractPayable: contractNode
                ? Codec.Ast.Utils.isContractPayable(contractNode)
                : null,
              isDesignatedInvalid: false
            }
          };
        })
    );
  },

  getSourceRange: function (instruction = {}) {
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
  findRange: function (findOverlappingRange, sourceStart, sourceLength) {
    // find nodes that fully contain requested range,
    // return one with longest pointer
    // (note: returns { range, node, pointer }
    let sourceEnd = sourceStart + sourceLength;
    let pointerLength = pointer => (pointer.match(/\//g) || []).length; //counts number of slashes in ptr
    return findOverlappingRange(sourceStart, sourceLength)
      .filter(({ range }) => sourceStart >= range[0] && sourceEnd <= range[1])
      .reduce(
        (acc, cur) =>
          pointerLength(cur.pointer) >= pointerLength(acc.pointer) ? cur : acc,
        { pointer: "" }
      );
    //note we make sure to bias towards cur (the new value being compared) rather than acc (the old value)
    //so that we don't actually get {pointer: ""} as our result
  },

  //makes the overlap function for an AST
  makeOverlapFunction: function (ast) {
    let tree = new IntervalTree();
    let ranges = SourceMapUtils.rangeNodes(ast);
    for (let { range, node, pointer } of ranges) {
      let [start, end] = range;
      tree.insert(start, end, { range, node, pointer });
    }
    return (sourceStart, sourceLength) =>
      tree.search(sourceStart, sourceStart + sourceLength);
  },

  //for use by makeOverlapFunction
  rangeNodes: function (node, pointer = "") {
    if (node instanceof Array) {
      return [].concat(
        ...node.map((sub, i) =>
          SourceMapUtils.rangeNodes(sub, `${pointer}/${i}`)
        )
      );
    } else if (node instanceof Object) {
      let results = [];

      if (node.src !== undefined && node.nodeType !== undefined) {
        //don't add "pseudo-nodes" (i.e.: outside variable references
        //in assembly) with no nodeType
        results.push({ pointer, node, range: SourceMapUtils.getRange(node) });
      }

      return results.concat(
        ...Object.keys(node).map(key =>
          SourceMapUtils.rangeNodes(node[key], `${pointer}/${key}`)
        )
      );
    } else {
      return [];
    }
  },

  getRange: function (node) {
    // src: "<start>:<length>:<_>"
    // returns [start, end]
    let [start, length] = node.src
      .split(":")
      .slice(0, 2)
      .map(i => parseInt(i));

    return [start, start + length];
  },

  //takes an array of instructions & an index into it
  //and asks: is this index the start of this instruction array the
  //start of a Solidity designated invalid function?
  //i.e. what an uninitialized internal function pointer jumps to?
  isDesignatedInvalid: function (
    instructions,
    index,
    overlapFunctions,
    node = undefined
  ) {
    const oldSequence = [{ name: "JUMPDEST" }, { name: "INVALID" }];
    const panicSelector = Web3Utils.soliditySha3({
      type: "string",
      value: "Panic(uint256)"
    }).slice(0, 2 + 2 * Codec.Evm.Utils.SELECTOR_SIZE);
    const paddedSelector = panicSelector.padEnd(
      2 + 2 * Codec.Evm.Utils.WORD_SIZE,
      "00"
    );
    //we double and add 2 because we're using hex strings...
    const newSequence = [
      { name: "JUMPDEST" },
      { name: "PUSH32", pushData: paddedSelector },
      { name: "PUSH1", pushData: "0x00" },
      { name: "MSTORE" },
      { name: "PUSH1", pushData: "0x51" },
      { name: "PUSH1", pushData: "0x04" },
      { name: "MSTORE" },
      { name: "PUSH1", pushData: "0x24" },
      { name: "PUSH1", pushData: "0x00" },
      { name: "REVERT" }
    ];

    const checkAgainstTemplate = (instructions, index, template) => {
      for (let offset = 0; offset < template.length; offset++) {
        const instruction = instructions[index + offset];
        const comparison = template[offset];
        if (!instruction || instruction.name !== comparison.name) {
          return false;
        }
        if (
          comparison.pushData &&
          instruction.pushData !== comparison.pushData
        ) {
          return false;
        }
      }
      return true;
    };

    //gets the final pushdata in a JUMPDEST, PUSH, [PUSH,] JUMP sequence;
    //returns null if the code is not of that form
    const getIndirectAddress = (instructions, startingIndex) => {
      let index = startingIndex;
      if (instructions[index].name !== "JUMPDEST") {
        return null;
      }
      index++;
      while (
        instructions[index] &&
        instructions[index].name.match(/^PUSH\d*/)
      ) {
        index++;
        if (index > startingIndex + 3) {
          //check: are there more than 2 PUSHes?
          return null;
        }
      }
      if (!instructions[index]) {
        //covers both the case where we ran off already,
        //and where we're about to run off
        return null;
      }
      if (instructions[index].name === "JUMP") {
        if (index === startingIndex + 1) {
          //check: was there at least one push?
          return null;
        }
        index--;
        return parseInt(instructions[index].pushData);
      } else {
        return null;
      }
    };

    //if it matches either direct template, return true
    if (
      checkAgainstTemplate(instructions, index, oldSequence) ||
      checkAgainstTemplate(instructions, index, newSequence)
    ) {
      return true;
    }

    //if it's panic_error_0x51, return true
    if (
      node &&
      node.nodeType === "YulFunctionDefinition" &&
      node.name === "panic_error_0x51"
    ) {
      return true;
    }

    //otherwise, check if it's indirect for the new template
    //(or for panic_error_0x51)
    const jumpAddress = getIndirectAddress(instructions, index);
    if (jumpAddress !== null) {
      const jumpIndex = instructions.findIndex(
        instruction => instruction.pc === jumpAddress
      );
      if (jumpIndex !== -1) {
        if (checkAgainstTemplate(instructions, jumpIndex, newSequence)) {
          return true;
        }
        debug("indirect: %O", instructions.slice(index, index + 4));
        debug("jumpAddress: %d", jumpAddress);
        debug("jumpIndex: %d", jumpIndex);
        debug("instr count: %d", instructions.length);
        const jumpInstruction = instructions[jumpIndex];
        const jumpFile = jumpInstruction.file;
        if (jumpFile !== -1) {
          const findOverlappingRange = overlapFunctions[jumpFile];
          const range = SourceMapUtils.getSourceRange(jumpInstruction);
          const { node: jumpNode } = SourceMapUtils.findRange(
            findOverlappingRange,
            range.start,
            range.length
          );
          if (
            jumpNode &&
            jumpNode.nodeType === "YulFunctionDefinition" &&
            jumpNode.name === "panic_error_0x51"
          ) {
            return true;
          }
        }
      }
    }

    //otherwise, return false
    return false;
  }
};

module.exports = SourceMapUtils;
