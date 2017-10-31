function Call(context, type) {
  this.instructionIndex = 0;
  this.context = context;
  this.type = type;
  this.functionDepth = 1;
};

Call.prototype.advance = function(stack) {
  var currentInstruction = this.currentInstruction();

  if (this.isJump()) {
    // Use clues from the solidity source map to know whether or not
    // we've gone into or out of a function.
    if (currentInstruction.jump == "i") {
      this.functionDepth += 1;
    }

    if (currentInstruction.jump == "o") {
      this.functionDepth -= 1;
    }

    this.executeJump(stack);
  } else {
    this.instructionIndex += 1;
  }

  return this.currentInstruction();
};

Call.prototype.currentInstruction = function() {
  return this.context.instructions[this.instructionIndex];
};

Call.prototype.executeJump = function(stack) {
  var instruction = this.currentInstruction();

  var programCounter = null;

  switch (instruction.name) {
    case "JUMP":
      programCounter = parseInt(stack[stack.length - 1], 16);
      break;
    case "JUMPI":
      var conditional = parseInt(stack[stack.length - 2], 16);
      if (conditional == 1) {
        programCounter = parseInt(stack[stack.length - 1], 16);
      }
      break;
  }

  if (programCounter) {
    var toInstruction = this.context.instructionAtProgramCounter(programCounter);
    this.instructionIndex = toInstruction.index;
  } else {
    // This means we didn't jump. Move onto the next instruction.
    this.instructionIndex += 1;
  }
};

Call.prototype.isJump = function(instruction) {
  if (!instruction) {
    instruction = this.currentInstruction();
  }
  return instruction.name != "JUMPDEST" && instruction.name.indexOf("JUMP") == 0;
};

Call.prototype.binary = function() {
  return this.context.binary;
};

module.exports = Call;
