'use strict'
var codes = {
  // 0x0 range - arithmetic ops
  // name, baseCost, off stack, on stack, dynamic
  0x00: ['STOP', 0, 0, 0, false],
  0x01: ['ADD', 3, 2, 1, false],
  0x02: ['MUL', 5, 2, 1, false],
  0x03: ['SUB', 3, 2, 1, false],
  0x04: ['DIV', 5, 2, 1, false],
  0x05: ['SDIV', 5, 2, 1, false],
  0x06: ['MOD', 5, 2, 1, false],
  0x07: ['SMOD', 5, 2, 1, false],
  0x08: ['ADDMOD', 8, 3, 1, false],
  0x09: ['MULMOD', 8, 3, 1, false],
  0x0a: ['EXP', 10, 2, 1, false],
  0x0b: ['SIGNEXTEND', 5, 1, 1, false],

  // 0x10 range - bit ops
  0x10: ['LT', 3, 2, 1, false],
  0x11: ['GT', 3, 2, 1, false],
  0x12: ['SLT', 3, 2, 1, false],
  0x13: ['SGT', 3, 2, 1, false],
  0x14: ['EQ', 3, 2, 1, false],
  0x15: ['ISZERO', 3, 1, 1, false],
  0x16: ['AND', 3, 2, 1, false],
  0x17: ['OR', 3, 2, 1, false],
  0x18: ['XOR', 3, 2, 1, false],
  0x19: ['NOT', 3, 1, 1, false],
  0x1a: ['BYTE', 3, 2, 1, false],

  // 0x20 range - crypto
  0x20: ['SHA3', 30, 2, 1, false],

  // 0x30 range - closure state
  0x30: ['ADDRESS', 2, 0, 1, true],
  0x31: ['BALANCE', 20, 1, 1, true],
  0x32: ['ORIGIN', 2, 0, 1, true],
  0x33: ['CALLER', 2, 0, 1, true],
  0x34: ['CALLVALUE', 2, 0, 1, true],
  0x35: ['CALLDATALOAD', 3, 1, 1, true],
  0x36: ['CALLDATASIZE', 2, 0, 1, true],
  0x37: ['CALLDATACOPY', 3, 3, 0, true],
  0x38: ['CODESIZE', 2, 0, 1, false],
  0x39: ['CODECOPY', 3, 3, 0, false],
  0x3a: ['GASPRICE', 2, 0, 1, false],
  0x3b: ['EXTCODESIZE', 20, 1, 1, true],
  0x3c: ['EXTCODECOPY', 20, 4, 0, true],

  // '0x40' range - block operations
  0x40: ['BLOCKHASH', 20, 1, 1, true],
  0x41: ['COINBASE', 2, 0, 1, true],
  0x42: ['TIMESTAMP', 2, 0, 1, true],
  0x43: ['NUMBER', 2, 0, 1, true],
  0x44: ['DIFFICULTY', 2, 0, 1, true],
  0x45: ['GASLIMIT', 2, 0, 1, true],

  // 0x50 range - 'storage' and execution
  0x50: ['POP', 2, 1, 0, false],
  0x51: ['MLOAD', 3, 1, 1, false],
  0x52: ['MSTORE', 3, 2, 0, false],
  0x53: ['MSTORE8', 3, 2, 0, false],
  0x54: ['SLOAD', 50, 1, 1, true],
  0x55: ['SSTORE', 0, 2, 0, true],
  0x56: ['JUMP', 8, 1, 0, false],
  0x57: ['JUMPI', 10, 2, 0, false],
  0x58: ['PC', 2, 0, 1, false],
  0x59: ['MSIZE', 2, 0, 1, false],
  0x5a: ['GAS', 2, 0, 1, false],
  0x5b: ['JUMPDEST', 1, 0, 0, false],

  // 0x60, range
  0x60: ['PUSH1', 3, 0, 1, false],
  0x61: ['PUSH2', 3, 0, 1, false],
  0x62: ['PUSH3', 3, 0, 1, false],
  0x63: ['PUSH4', 3, 0, 1, false],
  0x64: ['PUSH5', 3, 0, 1, false],
  0x65: ['PUSH6', 3, 0, 1, false],
  0x66: ['PUSH7', 3, 0, 1, false],
  0x67: ['PUSH8', 3, 0, 1, false],
  0x68: ['PUSH9', 3, 0, 1, false],
  0x69: ['PUSH10', 3, 0, 1, false],
  0x6a: ['PUSH11', 3, 0, 1, false],
  0x6b: ['PUSH12', 3, 0, 1, false],
  0x6c: ['PUSH13', 3, 0, 1, false],
  0x6d: ['PUSH14', 3, 0, 1, false],
  0x6e: ['PUSH15', 3, 0, 1, false],
  0x6f: ['PUSH16', 3, 0, 1, false],
  0x70: ['PUSH17', 3, 0, 1, false],
  0x71: ['PUSH18', 3, 0, 1, false],
  0x72: ['PUSH19', 3, 0, 1, false],
  0x73: ['PUSH20', 3, 0, 1, false],
  0x74: ['PUSH21', 3, 0, 1, false],
  0x75: ['PUSH22', 3, 0, 1, false],
  0x76: ['PUSH23', 3, 0, 1, false],
  0x77: ['PUSH24', 3, 0, 1, false],
  0x78: ['PUSH25', 3, 0, 1, false],
  0x79: ['PUSH26', 3, 0, 1, false],
  0x7a: ['PUSH27', 3, 0, 1, false],
  0x7b: ['PUSH28', 3, 0, 1, false],
  0x7c: ['PUSH29', 3, 0, 1, false],
  0x7d: ['PUSH30', 3, 0, 1, false],
  0x7e: ['PUSH31', 3, 0, 1, false],
  0x7f: ['PUSH32', 3, 0, 1, false],

  0x80: ['DUP1', 3, 0, 1, false],
  0x81: ['DUP2', 3, 0, 1, false],
  0x82: ['DUP3', 3, 0, 1, false],
  0x83: ['DUP4', 3, 0, 1, false],
  0x84: ['DUP5', 3, 0, 1, false],
  0x85: ['DUP6', 3, 0, 1, false],
  0x86: ['DUP7', 3, 0, 1, false],
  0x87: ['DUP8', 3, 0, 1, false],
  0x88: ['DUP9', 3, 0, 1, false],
  0x89: ['DUP10', 3, 0, 1, false],
  0x8a: ['DUP11', 3, 0, 1, false],
  0x8b: ['DUP12', 3, 0, 1, false],
  0x8c: ['DUP13', 3, 0, 1, false],
  0x8d: ['DUP14', 3, 0, 1, false],
  0x8e: ['DUP15', 3, 0, 1, false],
  0x8f: ['DUP16', 3, 0, 1, false],

  0x90: ['SWAP1', 3, 0, 0, false],
  0x91: ['SWAP2', 3, 0, 0, false],
  0x92: ['SWAP3', 3, 0, 0, false],
  0x93: ['SWAP4', 3, 0, 0, false],
  0x94: ['SWAP5', 3, 0, 0, false],
  0x95: ['SWAP6', 3, 0, 0, false],
  0x96: ['SWAP7', 3, 0, 0, false],
  0x97: ['SWAP8', 3, 0, 0, false],
  0x98: ['SWAP9', 3, 0, 0, false],
  0x99: ['SWAP10', 3, 0, 0, false],
  0x9a: ['SWAP11', 3, 0, 0, false],
  0x9b: ['SWAP12', 3, 0, 0, false],
  0x9c: ['SWAP13', 3, 0, 0, false],
  0x9d: ['SWAP14', 3, 0, 0, false],
  0x9e: ['SWAP15', 3, 0, 0, false],
  0x9f: ['SWAP16', 3, 0, 0, false],

  0xa0: ['LOG0', 375, 2, 0, false],
  0xa1: ['LOG1', 375, 3, 0, false],
  0xa2: ['LOG2', 375, 4, 0, false],
  0xa3: ['LOG3', 375, 5, 0, false],
  0xa4: ['LOG4', 375, 6, 0, false],

  // '0xf0' range - closures
  0xf0: ['CREATE', 32000, 3, 1, true],
  0xf1: ['CALL', 40, 7, 1, true],
  0xf2: ['CALLCODE', 40, 7, 1, true],
  0xf3: ['RETURN', 0, 2, 0, false],
  0xf4: ['DELEGATECALL', 40, 6, 1, true],
  0xf5: ['CALLBLACKBOX', 7, 1, 40],
  0xfa: ['STATICCALL', 6, 1, 40],
  0xfd: ['REVERT', 2, 0, 0],

  // '0x70', range - other
  0xff: ['SUICIDE', 0, 1, 0, false]
}

module.exports = function (op, full) {
  var code = codes[op] ? codes[op] : ['INVALID', 0]

  var opcode = code[0]

  if (full) {
    if (opcode === 'LOG') {
      opcode += op - 0xa0
    }

    if (opcode === 'PUSH') {
      opcode += op - 0x5f
    }

    if (opcode === 'DUP') {
      opcode += op - 0x7f
    }

    if (opcode === 'SWAP') {
      opcode += op - 0x8f
    }
  }

  return {name: opcode, fee: code[1], in: code[2], out: code[3], dynamic: code[4], async: code[5]}
}
