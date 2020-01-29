# @truffle/code-utils
Utilities for parsing and managing EVM-compatible bytecode

### Usage

```javascript
const { parseCode } = require("@truffle/code-utils");

const contractHexCode = "0x608060...";

// parseCode returns an array of instructions
// Ex.
// [ { pc: 0, name: 'PUSH1', pushData: '0x80' },
//   { pc: 2, name: 'PUSH1', pushData: '0x40' },
//   ... ]
const parsedCode = parseCode(contractHexCode);
```
