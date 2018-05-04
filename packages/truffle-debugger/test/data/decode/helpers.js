import debugModule from "debug";
const debug = debugModule("test:data:decode:helpers");

import { assert } from "chai";

export function *generateUints() {
  let x = 0;
  while (true) {
    yield x;
    x++;
  }
}

export function solidityForFixtures(testName, fixtures) {
  return `pragma solidity ^0.4.23;

contract ${testName} {

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
`;
}

export function testCasesForFixtures(fixtures) {
  for (let { name, value: expected } of fixtures) {
    it(`correctly decodes ${name}`, () => {
      let definition = this.definitions[name];
      let ref = this.refs[name];
      let actual = this.decode(definition, ref);

      assert.deepEqual(actual, expected);
    });
  }
}
