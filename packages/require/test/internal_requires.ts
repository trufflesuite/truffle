import { file } from "../dist/index";
import path from "path";
import assert from "assert";
import mocha from "mocha";
import TruffleConfig from "@truffle/config";

describe("Require.file", function () {
  describe("JavaScript", function () {
    generateTests("javascript");
  });
  describe("TypeScript", function () {
    generateTests("typescript");
  });
});

const testModules = {
  typescript: {
    global: "typescript_module_with_global_import.ts",
    local_file: "typescript_module_with_local_file_import.ts",
    local_module: "typescript_module_with_local_module_import.ts"
  },
  javascript: {
    global: "module_with_global_require.js",
    local_file: "module_with_local_file_require.js",
    local_module: "module_with_local_module_require.js"
  }
};

function generateTests(language: "typescript" | "javascript") {
  it("allows internal require statements for globally installed modules", function () {
    const exports = file({
      file: path.join(__dirname, "lib", testModules[language].global),
      config: TruffleConfig.default().with({
        working_directory: path.join(__dirname, "lib")
      })
    });

    // It should export a function. Call the function.
    const obj = exports();

    // It should return the path object. This should be the same object
    // as the one we required at the top of this file.
    assert.equal(obj, path);
  });

  it("allows require statements for local files", function () {
    const exports = file({
      file: path.join(__dirname, "lib", testModules[language].local_file),
      config: TruffleConfig.default().with({
        working_directory: path.join(__dirname, "lib")
      })
    });
    // It should export a function, which, since we're using the global require in
    // the file, should be a function that returns the same function exported
    // in the test above.
    const module_with_global_require = exports();

    // Let's ride this train all the way down to path.
    const obj = module_with_global_require();

    // It should return the path object. This should be the same object
    // as the one we required at the top of this file.
    assert.equal(obj, path);
  });

  it("allows require statements for locally install modules (node_modules)", function () {
    const exports = file({
      file: path.join(__dirname, "lib", testModules[language].local_module),
      config: TruffleConfig.default().with({
        working_directory: path.join(__dirname, "lib")
      })
    });
    // It should export a function. Call the function.
    const obj = exports();

    // It should return the mocha object. This should be the same object
    // as the one we required at the top of this file.
    assert.equal(obj, mocha);
  });
}
