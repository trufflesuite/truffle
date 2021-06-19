const { getDefaultGithubBranch } = require("../dist/lib/utils/unbox");
const assert = require("assert");

describe("Get Primary Github branch", () => {
  it("detects the master", async () => {
    // pet-shop-box default branch is master
    const url = "https://github.com:truffle-box/pet-shop-box";
    const branch = await getDefaultGithubBranch(url);
    assert.strictEqual("master", branch );
  })

  // Note: there should be a dedicated url for testing
  // but for the polygon-box will be used since it is
  // convenient...
  it("detects the main", async () => {
    // the API expects a "url" in this format
    // polygon-box default branch is master
    const url = "https://github.com:truffle-box/polygon-box";
    const branch = await getDefaultGithubBranch(url);
    assert.strictEqual("main", branch );
  })
})
