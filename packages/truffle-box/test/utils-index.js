const assert = require("assert");
const utils = require("../lib/utils");

describe("utils", () => {
  it("setUpBox throws when passed an invalid boxConfig", () => {
    let boxConfig = {};

    utils
      .setUpBox(boxConfig)
      .then(() => assert(false, "didn't throw!"))
      .catch(e =>
        assert(e.stack.match(/(Error:).*(post-unpack).*(undefined)/g))
      );
  });
});
