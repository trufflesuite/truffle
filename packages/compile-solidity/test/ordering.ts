import debugModule from "debug";
const debug = debugModule("compile:test:test_ordering");
import Config from "@truffle/config";
import { Compile } from "@truffle/compile-solidity";
import { CompilerSupplier } from "../dist/compilerSupplier";
import { assert } from "chai";
import { findOne } from "./helpers";
import * as fs from "fs";
import * as path from "path";
let compileOptions,
  supplierOptions,
  simpleOrderedSource,
  complexOrderedSource,
  inheritedSource,
  solc;
// let compileOptions = Config.default().merge({
//   contracts_directory: "",
//   compilers: {
//     solc: {
//       version: "0.4.25",
//       settings: {
//         optimizer: {
//           enabled: false,
//           runs: 200
//         }
//       }
//     }
//   },
//   quiet: true
// });

describe("Compile - solidity ^0.4.0", function () {
  this.timeout(5000);

  beforeEach(function () {
    compileOptions = Config.default().merge({
      contracts_directory: "",
      compilers: {
        solc: {
          version: "0.4.25",
          settings: {
            optimizer: {
              enabled: false,
              runs: 200
            }
          }
        }
      },
      quiet: true
    });
    supplierOptions = {
      solcConfig: compileOptions.compilers.solc,
      events: {
        emit: () => {}
      }
    };
  });

  before("get solc", async function () {
    this.timeout(40000);
    const supplier = new CompilerSupplier(supplierOptions);
    ({ solc } = await supplier.load());
  });

  describe("ABI Ordering", function () {
    before("get code", function () {
      simpleOrderedSource = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.x/SimpleOrdered.sol"),
        "utf-8"
      );
      complexOrderedSource = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.x/ComplexOrdered.sol"),
        "utf-8"
      );
      inheritedSource = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.x/InheritB.sol"),
        "utf-8"
      );
    });

    // Ordered.sol's methods are ordered semantically.
    // solc alphabetizes methods within a file (but interpolates imported methods).
    it("Simple ABI should be out of source order when solc compiles it", function () {
      var alphabetic = ["andThird", "second", "theFirst"];
      var input = {
        language: "Solidity",
        sources: { "SimpleOrdered.sol": { content: simpleOrderedSource } },
        settings: { outputSelection: { "*": { "*": ["abi"] } } }
      };

      var result = solc.compile(JSON.stringify(input));
      result = JSON.parse(result);
      var abi = result.contracts["SimpleOrdered.sol"]["SimpleOrdered"].abi.map(
        function (item) {
          return item.name;
        }
      );
      assert.deepEqual(abi, alphabetic);
    });

    it("orders the simple ABI", async function () {
      const expectedOrder = ["theFirst", "second", "andThird"];
      const sources = {};
      sources["SimpleOrdered.sol"] = simpleOrderedSource;

      const { compilations } = await Compile.sources({
        sources,
        options: compileOptions
      });

      const SimpleOrdered = findOne("SimpleOrdered", compilations[0].contracts);
      const abi = SimpleOrdered.abi.map(({ name }) => name);
      assert.deepEqual(abi, expectedOrder);
    });

    // Ordered.sol's methods are ordered semantically.
    // solc alphabetizes methods within a file (but interpolates imported methods).
    it("Complex ABI should be out of source order when solc compiles it", function () {
      var alphabetic = [
        "andThird",
        "second",
        "theFirst",
        "LogB",
        "LogA",
        "LogD",
        "LogC"
      ];
      var input = {
        language: "Solidity",
        sources: {
          "ComplexOrdered.sol": { content: complexOrderedSource },
          "InheritB.sol": { content: inheritedSource }
        },
        settings: { outputSelection: { "*": { "*": ["abi"] } } }
      };

      var result = solc.compile(JSON.stringify(input));
      result = JSON.parse(result);
      debug("result %o", result);
      var abi = result.contracts["ComplexOrdered.sol"][
        "ComplexOrdered"
      ].abi.map(function (item) {
        return item.name;
      });
      assert.deepEqual(abi, alphabetic);
    });

    it("orders the complex ABI", async function () {
      var expectedOrder = [
        "LogB",
        "LogA",
        "LogD",
        "LogC",
        "theFirst",
        "second",
        "andThird"
      ];
      var sources = {};
      sources["ComplexOrdered.sol"] = complexOrderedSource;
      sources["InheritB.sol"] = inheritedSource;

      const { compilations } = await Compile.sources({
        sources,
        options: compileOptions
      });
      const ComplexOrdered = findOne(
        "ComplexOrdered",
        compilations[0].contracts
      );
      var abi = ComplexOrdered.abi.map(({ name }) => name);
      assert.deepEqual(abi, expectedOrder);
    });

    // Ported from `@truffle/solidity-utils`
    it("orders the ABI of a contract without functions", async function () {
      var sources = {};
      // ComplexOrdered.sol includes contract `Empty`
      sources["ComplexOrdered.sol"] = complexOrderedSource;
      sources["InheritB.sol"] = inheritedSource;

      const { compilations } = await Compile.sources({
        sources,
        options: compileOptions
      });
      const Empty = findOne("Empty", compilations[0].contracts);
      assert.equal(Empty.abi.length, 0);
    });
  });
});
