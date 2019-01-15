const assert = require("assert");
const sinon = require("sinon");
const request = require("request-promise");
const {
  LoadingStrategy
} = require("../../../compilerSupplier/loadingStrategies");
let result;

describe("LoadingStrategy base class", () => {
  beforeEach(() => {
    instance = new LoadingStrategy();
  });
});
