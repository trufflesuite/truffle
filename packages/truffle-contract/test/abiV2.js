var assert = require("chai").assert;
var util = require("./util");

// attribution where it's due - parts of this test are from this gist:
// https://gist.github.com/ricmoo/e38d4d71dff7156033922d2e5de88d37

describe("ABIEncoderV2", function() {
  describe("structs in ABI", function() {
    let addUserReceipt;
    let userDirectory;

    const user = {
      name: "Rick Sanchez",
      addr: "0xCB00CDE33a7a0Fba30C63745534F1f7Ae607076b",
      contact: {
        email: "rick.c137@citadel.cfc",
        phone: "+1 (555) 314-1593"
      }
    };

    before(async function() {
      this.timeout(10000);

      UserDirectory = await util.createABIV2UserDirectory();

      await util.setUpProvider(UserDirectory, {});

      userDirectory = await UserDirectory.new();
      const { receipt } = await userDirectory.addUser(user);

      addUserReceipt = receipt;
    });

    it("should allow structs as transaction arguments", async function() {
      assert.strictEqual(
        addUserReceipt.status,
        true,
        "addUser transaction should have succeeded."
      );
    });

    it("should allow structs in logs", async function() {
      const logs = addUserReceipt.logs;

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].args.addr, user.addr);

      // can't just do assert.deepStrictEqual(logs[0].args.user, user) because
      // the decoded struct is actually a tuple, and to emulate that it's
      // returned as an array with the field names patched into it
      assert.deepStrictEqual(logs[0].args.user.name, user.name);
      assert.deepStrictEqual(logs[0].args.user.addr, user.addr);
      assert.deepStrictEqual(
        logs[0].args.user.contact.email,
        user.contact.email
      );
      assert.deepStrictEqual(
        logs[0].args.user.contact.phone,
        user.contact.phone
      );
    });

    it("should be capable of returning structs from calls", async function() {
      const returnedUser = await userDirectory.user(user.addr);

      // can't just do assert.deepStrictEqual(returnedUser, user) because
      // the decoded struct is actually a tuple, and to emulate that it's
      // returned as an array with the field names patched into it
      assert.deepStrictEqual(returnedUser.name, user.name);
      assert.deepStrictEqual(returnedUser.addr, user.addr);
      assert.deepStrictEqual(returnedUser.contact.email, user.contact.email);
      assert.deepStrictEqual(returnedUser.contact.phone, user.contact.phone);
    });
  });
});
