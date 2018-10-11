var contract = require("../");
var fs = require("fs");
var assert = require("assert");
var path = require("path");

describe("Deprecated json keys", function() {

  var MetaCoin_data;
  var MetaCoin;

  before("read json data", function() {
    var data = fs.readFileSync(path.join(__dirname, "./sources/MetaCoin.json"), "utf8");
    MetaCoin_data = JSON.parse(data);
  });

  it("successfully turns `unlinked_binary` into bytecode", function() {
    MetaCoin = contract(MetaCoin_data);
    assert.equal(MetaCoin.bytecode, MetaCoin_data.unlinked_binary);
  });

});
