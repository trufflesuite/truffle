import debugModule from "debug";
const debug = debugModule("debugger:test:data:decode");

import faker from "faker";

import evm from "lib/evm/selectors";

import { generateUints, describeDecoding } from "./helpers";

const uints = generateUints();

function generateArray(length) {
  return [...Array(length)].map(() => uints.next().value);
}

const commonFixtures = [
  {
    name: "multipleFullWordArray",
    type: "uint[]",
    value: generateArray(3) // takes up 3 whole words
  },
  {
    name: "withinWordArray",
    type: "uint16[]",
    value: generateArray(10) // takes up >1/2 word
  },
  {
    name: "multiplePartWordArray",
    type: "uint64[]",
    value: generateArray(9) // takes up 2.25 words
  },
  {
    name: "inconvenientlyWordOffsetArray",
    type: "uint240[]",
    value: generateArray(3) // takes up ~2.8 words
  },
  {
    name: "shortString",
    type: "string",
    value: "hello world"
  },
  {
    name: "longString",
    type: "string",
    value: "solidity allocation is a fun lesson in endianness"
  }
];

const mappingFixtures = [
  {
    name: "simpleMapping",
    type: {
      from: "uint256",
      to: "uint256"
    },
    value: {
      ...Object.assign(
        {},
        ...generateArray(5).map((value, idx) => ({ [idx]: value }))
      )
    }
  },
  {
    name: "numberedStrings",
    type: {
      from: "uint256",
      to: "string"
    },
    value: {
      ...Object.assign(
        {},
        ...generateArray(7).map((value, idx) => ({
          [value]: faker.lorem.slug(idx)
        }))
      )
    }
  },
  {
    name: "stringsToStrings",
    type: {
      from: "string",
      to: "string"
    },
    value: {
      ...Object.assign(
        {},
        ...[0, 1, 2, 3, 4].map(idx => ({
          [faker.lorem.slug(idx)]: faker.lorem.slug(idx)
        }))
      )
    }
  }
];

debug("mappingFixtures %O", mappingFixtures);

describe("Decoding", function () {
  /*
   * Storage Tests
   */
  describeDecoding(
    "Storage Variables",
    commonFixtures,
    evm.current.state.storage,

    (contractName, fixtures) => {
      return `pragma solidity ^0.8.0;

contract ${contractName} {

  event Done();

  // declarations
  ${fixtures.map(({ type, name }) => `${type} ${name};`).join("\n  ")}

  function run() public {
    ${fixtures
      .map(({ name, value }) => `${name} = ${JSON.stringify(value)};`)
      .join("\n    ")}

    emit Done();
  }
}
`;
    }
  );

  describeDecoding(
    "Mapping Variables",
    mappingFixtures,
    evm.current.state.storage,

    (contractName, fixtures) => {
      return `pragma solidity ^0.8.0;

contract ${contractName} {
  event Done();

  // declarations
  ${fixtures
    .map(
      ({ name, type: { from, to } }) => `mapping (${from} => ${to}) ${name};`
    )
    .join("\n  ")}

  function run() public {
    ${fixtures
      .map(({ name, type: { from }, value }) =>
        Object.entries(value)
          .map(([k, v]) =>
            from === "string"
              ? `${name}["${k}"] = ${JSON.stringify(v)};`
              : `${name}[${k}] = ${JSON.stringify(v)};`
          )
          .join("\n    ")
      )
      .join("\n\n    ")}

    emit Done();
  }
}
`;
    }
  );

  /*
   * Memory Tests
   */
  describeDecoding(
    "Memory Variables",
    commonFixtures,
    evm.current.state.memory,

    (contractName, fixtures) => {
      const separator = ";\n    ";

      function declareAssign({ name, type, value }) {
        if (type.indexOf("[]") != -1) {
          // array, must `new`
          let declare = `${type} memory ${name} = new ${type}(${value.length})`;
          let assigns = value.map((k, i) => `${name}[${i}] = ${k}`);
          return `${declare}${separator}${assigns.join(separator)}`;
        } else {
          return `${type} memory ${name} = ${JSON.stringify(value)}`;
        }
      }

      return `pragma solidity ^0.8.0;

contract ${contractName} {

  event Done();

  function run() public {
    uint i;
    // declarations
    ${fixtures.map(declareAssign).join(separator)};

    emit Done();
  }
}
`;
    }
  );
});
