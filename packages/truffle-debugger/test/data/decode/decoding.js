import debugModule from "debug";
const debug = debugModule("test:data:decode");

import evm from "lib/evm/selectors";

import {
  generateUints, describeDecoding
} from "./helpers";

const uints = generateUints();

function generateArray(length) {
  return [...Array(length)]
    .map(() => uints.next().value)
}

const fixtures = [{
  name: "multipleFullWordArray",
  type: "uint[]",
  value: generateArray(3)  // takes up 3 whole words
}, {
  name: "withinWordArray",
  type: "uint16[]",
  value: generateArray(10)  // takes up >1/2 word
}, {
  name: "multiplePartWordArray",
  type: "uint64[]",
  value: generateArray(9)  // takes up 2.25 words
}, {
  name: "inconvenientlyWordOffsetArray",
  type: "uint240[]",
  value: generateArray(3)  // takes up ~2.8 words
}, {
  name: "shortString",
  type: "string",
  value: "hello world"
}, {
  name: "longString",
  type: "string",
  value: "solidity allocation is a fun lesson in endianness"
}];


describe("Decoding", function() {

  /*
   * Storage Tests
   */
  describeDecoding(
    "Storage Variables", fixtures, evm.current.state.storage,

    (contractName) => {
      return `pragma solidity ^0.4.23;

contract ${contractName} {

  event Done();

  // declarations
  ${fixtures
    .map( ({type, name}) => `${type} ${name};` )
    .join("\n  ")}

  function run() public {
    ${fixtures
      .map( ({name, value}) => `${name} = ${JSON.stringify(value)};` )
      .join("\n    ")}

    emit Done();
  }
}
`   }
  );

  /*
   * Memory Tests
   */
  describeDecoding(
    "Memory Variables", fixtures, evm.current.state.memory,

    (contractName) => {
      const separator = ";\n    ";

      function declareAssign({name, type, value}) {
        if (type.indexOf("[]") != -1) {
          // array, must `new`
          let declare = `${type} memory ${name} = new ${type}(${value.length})`
          let assigns = value.map((k, i) => `${name}[${i}] = ${k}`);
          return `${declare}${separator}${assigns.join(separator)}`
        } else {
          return `${type} memory ${name} = ${JSON.stringify(value)}`
        }
      }

      return `pragma solidity ^0.4.23;

contract ${contractName} {

  event Done();

  function run() public {
    uint i;
    // declarations
    ${fixtures.map(declareAssign).join(separator)};

    emit Done();
  }
}
`
    }
  );
});
