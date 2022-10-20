const assert = require("assert");
const { normalizeSourcePath: normalize } = require("../dist");

describe("@truffle/box.normalizeSourcePath unit tests", () => {
  describe("parses `git@`", () => {
    [
      {
        input: "git@github.com:truffle-box/a-box",
        expected: "https://github.com:truffle-box/a-box"
      },
      {
        input: "git@github.com:truffle-box/a-box#simple-branch",
        expected: "https://github.com:truffle-box/a-box#simple-branch"
      },
      {
        input: "git@github.com:truffle-box/a-box#some/complex/branch",
        expected: "https://github.com:truffle-box/a-box#some/complex/branch"
      },
      {
        input: "git@github.com/truffle-box/a-box#some/complex/branch",
        expected: "https://github.com:truffle-box/a-box#some/complex/branch"
      },
      {
        input: "git@GITHUB.COM:TRUFFLE-BOX/A-BOX#SOME/COMPLEX/BRANCH",
        expected: "https://GITHUB.COM:TRUFFLE-BOX/A-BOX#SOME/COMPLEX/BRANCH"
      }
    ].forEach(({ input, expected }) => {
      it(`passes \`${input}\``, () => {
        assert.strictEqual(normalize(input), expected, "should not fail");
      });
    });
  });

  describe("parses invalid git@", () => {
    const protocolRex = /invalid format .git.https./;
    [
      {
        input: "git@github.com:truffle-box",
        rex: protocolRex
      },
      {
        input: "git@@github.com/truffle-box/a-box",
        rex: protocolRex
      },
      {
        input: "git@github.com:truffle-box/a-box#simple-branch#",
        rex: protocolRex
      },
      {
        // git user is lowercase
        input: "GIT@github.com/truffle-box/a-box",
        rex: protocolRex
      },
      {
        // git user is lowercase
        input: "git@github.com/truffle-box/a-box#an/invalid/branch/",
        rex: protocolRex
      }
    ].forEach(({ input, rex }) => {
      it(`fails \`${input}\``, () => {
        assert.throws(
          () => normalize(input),
          rex,
          `\n\tmalformed \`${input}\`\n\tshould fail with git/https error message`
        );
      });
    });
  });

  describe("parses valid `https`", () => {
    [
      {
        input: "https://github.com/truffle-box/bare-box",
        expected: "https://github.com:truffle-box/bare-box"
      },
      {
        input: "https://github.com/truffle-box/bare-box#branch",
        expected: "https://github.com:truffle-box/bare-box#branch"
      },
      {
        input: "https://github.com/truffle-box/bare-box#a/long/branch",
        expected: "https://github.com:truffle-box/bare-box#a/long/branch"
      },

      {
        input: "HTTPS://GITHUB.COM/TRUFFLE-BOX/BARE-BOX#A/LONG/BRANCH",
        expected: "https://GITHUB.COM:TRUFFLE-BOX/BARE-BOX#A/LONG/BRANCH"
      }
    ].forEach(({ input, expected }) => {
      it(`pass: \`${input}\``, () => {
        assert.strictEqual(
          normalize(input),
          expected,
          `should parse: [${input}]`
        );
      });
    });
  });

  describe("parses invalid `https`", () => {
    const protocolRex = /invalid format .git.https./;
    [
      {
        input: "https:truffle-box/bare-box",
        description: "http:"
      },
      {
        input: "http:truffle-box/bare-box",
        description: "http:"
      },
      {
        input: "https::truffle-box/bare-box",
        description: "http::"
      },
      {
        input: "https:/truffle-box/bare-box",
        description: "http:/"
      },
      {
        input: "https://bare-box",
        description: "missing org/repo"
      }
    ].forEach(({ input, description }) => {
      it(`fails \`${input}\``, () => {
        assert.throws(
          () => normalize(input),
          protocolRex,
          `\n\tmalformed \`${description}\`\n\tshould fail with git/https error message`
        );
      });
    });
  });

  describe("parses valid simplified expressions", () => {
    [
      {
        input: "truffle-box/bare-box",
        expected: "https://github.com:truffle-box/bare-box"
      },
      {
        input: "truffle-box/bare-box#master",
        expected: "https://github.com:truffle-box/bare-box#master"
      },
      {
        input: "bare-box",
        expected: "https://github.com:truffle-box/bare-box"
      },
      {
        input: "bare-box#master",
        expected: "https://github.com:truffle-box/bare-box#master"
      }
    ].forEach(({ input, expected }) => {
      it(`pass: \`${input}\``, () => {
        assert.strictEqual(
          normalize(input),
          expected,
          `should parse: [${input}]`
        );
      });
    });
  });

  describe("parses invalid simplified expressions", () => {
    const protocolRex = /invalid format/;
    [
      {
        input: "truffle-box/bare-box/",
        description: "extra /"
      },
      {
        input: "truffle-box/bare-box#",
        description: "incomplete branch"
      }
    ].forEach(({ input, description }) => {
      it(`fails \`${input}\``, () => {
        assert.throws(
          () => normalize(input),
          protocolRex,
          `\n\tmalformed \`${input}\` (${description})\n\tshould fail with invalid format message`
        );
      });
    });
  });

  describe("handles -box suffix", () => {
    [
      {
        input: "bare-box",
        expected: "https://github.com:truffle-box/bare-box",
        description: "No org with box suffix"
      },
      {
        input: "bare",
        expected: "https://github.com:truffle-box/bare-box",
        description: "No org without box suffix"
      },
      {
        input: "truffle-box/bare-box",
        expected: "https://github.com:truffle-box/bare-box",
        description: "truffle-box with box suffix"
      },
      {
        input: "truffle-box/bare",
        expected: "https://github.com:truffle-box/bare-box",
        description: "truffle-box without box suffix"
      },
      {
        input: "acme/bare-box",
        expected: "https://github.com:acme/bare-box",
        description: "not truffle-box with box suffix"
      },
      {
        input: "acme/bare",
        expected: "https://github.com:acme/bare",
        description: "not truffle-box without box suffix"
      },
      ,
    ].forEach(({ input, description, expected }) => {
      it(`handles: \`${description}\``, () => {
        assert.strictEqual(
          normalize(input),
          expected,
          `should process: [${input}]`
        );
      });
    });
  });
});
