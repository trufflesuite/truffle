var ExtraLibrary = artifacts.require("@org/pkg/ExtraLibrary");
var ExtraLibraryX = artifacts.require("@org/pkg/ExtraLibraryX");
var ExtraLibrary2 = artifacts.require("dep2/ExtraLibrary2");
var ExtraOtherLibrary2 = artifacts.require("dep2/ExtraOtherLibrary2");
var Contract2 = artifacts.require("dep2/Contract2");
Contract2.link(ExtraLibraryX);
var Contract3 = artifacts.require("Contract3");

contract("stuff", function(accounts) {
    it("does thing", async function() {
        var extraLib = await ExtraLibrary.deployed();
        assert.equal(await extraLib.doThing(0), 51966);
    });

    it("does another thing", async function() {
        var extraLib2 = await ExtraLibrary2.deployed();
        assert(extraLib2.address);
    });

    it("does a third thing", async function() {
        var instance3 = await Contract3.deployed();
        assert(await instance3.doSpecialThing());
    });

    it("does a fourth thing", async function() {
        var extraLibX = await ExtraLibraryX.deployed();
        assert.equal(await extraLibX.transformValue(2), 1);
    });

    it("does a fifth thing", async function() {
        var instance2 = await Contract2.new();
        assert.equal(await instance2.doOtherThing(), 3735928558);
    });

    it("does a sixth thing", async function() {
        var extraOtherLib2 = await ExtraOtherLibrary2.deployed();
        assert.equal(await extraOtherLib2.doOtherThing(2), 3);
    })
});
