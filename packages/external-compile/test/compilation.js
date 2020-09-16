const path = require("path");
const assert = require("assert");
const { Compile } = require("../");

describe("compile(options)", () => {
  const options = {
    compilers: {
      external: {
        command: "echo 'dummy command!'",
        targets: [
          {
            path: path.resolve("./test/sources/A.json")
          }
        ]
      }
    }
  };

  it("outputs an object with an array of compilations", async () => {
    const result = await Compile.all(options);
    assert(Array.isArray(result.compilations));
  });

  it("returns contracts with bytecode in 'new' format (non-string)", async () => {
    const result = await Compile.all(options);
    const [{ contracts }] = result.compilations;
    assert(typeof contracts[0].bytecode !== "string");
    assert(typeof contracts[0].bytecode === "object");
  });
});
