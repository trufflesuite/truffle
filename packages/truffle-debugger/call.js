function Call(context) {
  this.instructionIndex = 0;
  this.context = context;
};

Call.prototype.stepInstruction = function(stack) {
  var currentInstruction = this.currentInstruction();

  if (this.isJump()) {
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
  }
};

Call.prototype.isJump = function(instruction) {
  if (!instruction) {
    instruction = this.currentInstruction();
  }
  return instruction.name != "JUMPDEST" && instruction.name.indexOf("JUMP") == 0;
};

module.exports = Call;
