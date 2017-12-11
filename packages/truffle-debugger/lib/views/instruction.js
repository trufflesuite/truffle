export default class InstructionView {
  isJump(instruction) {
    return instruction.name != "JUMPDEST" && instruction.name.indexOf("JUMP") == 0;
  }

  isCall(instruction) {
    return instruction.name == "CALL" || instruction.name == "DELEGATECALL";
  }

  isCreate(instruction) {
    return instruction.name == "CREATE";
  }

  isHalting(instruction) {
    return instruction.name == "STOP" || instruction.name == "RETURN";
  }

  hasMultiLineCodeRange(instruction) {
    return instruction.range.start.line != instruction.range.end.line;
  }
}
