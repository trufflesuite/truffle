// @ts-ignore
import fs from "fs/promises";
import * as sinon from "sinon";
import { assert } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";
import { Cache } from "@truffle/compile-solidity";
let cache;

describe("Cache", function () {
  describe(".loadFile", function () {
    describe("when the file content is memoized", function () {
      beforeEach(async function () {
        cache = new Cache();
        // invoking add memoizes the file contents
        await cache.add("these are the file contents", "myFileName.json");
        sinon.stub(fs, "readFile");
        sinon.stub(cache.memoizedCompilers, "set");
      });
      afterEach(async function () {
        // @ts-ignore - what the hell are ya doin TS?
        await fs.rm(cache.resolve("myFileName.json"), { force: true });
        // @ts-ignore
        fs.readFile.restore();
        cache.memoizedCompilers.set.restore();
      });

      it("returns the memoized file contents as a string", async function () {
        const result = await cache.loadFile("myFileName.json");
        assert.equal(result, "these are the file contents");
      });
      it("doesn't read the file from disk", async function () {
        await cache.loadFile("myFileName.json");
        // @ts-ignore
        assert(!fs.readFile.called);
      });
      it("doesn't memoize the contents", async function () {
        await cache.loadFile("myFileName.json");
        assert(!cache.memoizedCompilers.called);
      });
    });

    describe("when the file content is not memoized", function () {
      beforeEach(async function () {
        // create new cache to ensure nothing is memoized
        cache = new Cache();
        // create file to load contents from
        await fs.writeFile(cache.resolve("myFileName.json"), "file contents");
        sinon.stub(cache.memoizedCompilers, "get");
      });
      afterEach(function () {
        cache.memoizedCompilers.get.restore();
      });

      it("loads the file from disk", async function () {
        const result = await cache.loadFile("myFileName.json");
        // the get method for the map should not have been called
        assert(!cache.memoizedCompilers.get.called);
        assert.equal(result, "file contents");
      });
    });
  });
});
