const assert = require("assert");
const sinon = require("sinon");
const fse = require("fs-extra");
const path = require("path");
const inquirer = require("inquirer");
const utils = require("../dist/lib/utils/recipe").default;
const boxConfig = require("../dist/lib/config");

const recipes = {
  prompts: [{ message: "Milk / dark chocolate?" }, { message: "Filling?" }],
  common: ["chocolate.txt"],
  specs: {
    "milk chocolate": {
      mint: ["mint-out-of-stock.txt"],
      cookie: [
        "cookie-selection.txt",
        { from: "milk/cookie/ingredients.txt", to: "ingredients.txt" }
      ]
    },
    "dark chocolate": [
      "picking-strawberry.txt",
      { from: "dark/strawberry/ingredients.txt", to: "ingredients.txt" }
    ]
  }
};
const allFiles = [
  "chocolate.txt",
  "mint-out-of-stock.txt",
  "cookie-selection.txt",
  "picking-strawberry.txt",
  "milk/cookie/ingredients.txt",
  "dark/strawberry/ingredients.txt"
];
const mintAllFiles = ["mint-out-of-stock.txt", "chocolate.txt"];
const cookieAllFiles = [
  "cookie-selection.txt",
  { from: "milk/cookie/ingredients.txt", to: "ingredients.txt" },
  "chocolate.txt"
];
const recipeFiles = ["chocolate.txt", "mint-out-of-stock.txt"];
const recipeFilesWithMv = [
  "chocolate.txt",
  "picking-strawberry.txt",
  { from: "dark/strawberry/ingredients.txt", to: "ingredients.txt" }
];
const defaultBoxConfig = boxConfig.setDefaults();
const boxConfigWithRecipe = boxConfig.setDefaults({ recipes });

describe("utils", () => {
  describe("fs", () => {
    const destination = path.join(__dirname, ".truffle_test_tmp");
    const file1 = "foo.txt";
    const file2 = "bar.txt";
    const file3 = "nested-0/hello.txt";
    const file4 = "nested-0/nested-1/truffle.txt";
    const files = [file1, file2, file3, file4].sort();

    beforeEach(() => {
      fse.ensureDirSync(destination);
      files.forEach(file => {
        fse.ensureFileSync(path.join(destination, file));
      });
    });

    afterEach(() => {
      fse.removeSync(destination);
    });

    describe("traverseDir", () => {
      it("finds every file in dir with returnRelative=true", () => {
        const val = utils.traverseDir(destination, true).sort();
        assert.deepStrictEqual(val, files, "should have identical files!");
      });

      it("finds every file in dir with returnRelative=false", () => {
        const val = utils.traverseDir(destination, false).sort();
        assert.deepStrictEqual(
          val,
          files.map(file => path.join(destination, file)),
          "should have identical files!"
        );
      });
    });

    describe("removeEmptyDirs", () => {
      it("does nothing when 0 empty subdir exist", () => {
        utils.removeEmptyDirs(destination);
        const val = utils.traverseDir(destination).sort();
        assert.deepStrictEqual(val, files, "shouldn't remove anything!");
      });

      it("removes empty subdirs when >=1 exist", () => {
        fse.removeSync(path.join(destination, file4));
        fse.removeSync(path.join(destination, file3));
        utils.removeEmptyDirs(destination);
        const val = utils.traverseDir(destination).sort();
        assert.deepStrictEqual(
          val,
          [file1, file2].sort(),
          "should remove nested empty dir!"
        );
      });
    });
  });

  describe("boxHasRecipe", () => {
    it("returns true when >=1 recipes are defined", () => {
      const val = utils.boxHasRecipe(boxConfigWithRecipe);
      assert.deepStrictEqual(val, true, "should be true!");
    });

    it("returns false when 0 recipe is defined", () => {
      const val = utils.boxHasRecipe(defaultBoxConfig);
      assert.deepStrictEqual(val, false, "should be false!");
    });
  });

  describe("locateRecipe", () => {
    afterEach(() => {
      if (inquirer.prompt.restore) {
        inquirer.prompt.restore();
      }
    });

    it("returns the correct recipe through inquirer", async () => {
      sinon
        .stub(inquirer, "prompt")
        .onFirstCall()
        .returns({ choice: "milk chocolate" })
        .onSecondCall()
        .returns({ choice: "cookie" });
      const val = await utils.locateRecipe(boxConfigWithRecipe, "");
      assert.deepStrictEqual(val, cookieAllFiles, "incorrect recipe!");
    });

    it("returns the correct recipe through CLI option", async () => {
      const val = await utils.locateRecipe(
        boxConfigWithRecipe,
        "milk chocolate,mint"
      );
      assert.deepStrictEqual(val, mintAllFiles, "incorrect recipe!");
    });

    it("rejects when there is no recipe", () => {
      assert.rejects(async () => {
        await utils.locateRecipe(boxConfig, "");
      }, "should have rejected!");
    });

    // Skipping the following tests:
    // - "considers partially correct CLI option"
    // - "ignores wholly incorrect CLI option"
    // They are moot due to how stubbing inquirer works.
  });

  describe("processRecipe", () => {
    it("handles recipe with mv", () => {
      const { recipeMvs, recipeFilesSet } =
        utils.processRecipe(recipeFilesWithMv);
      const expectedRecipeMvs = [
        { from: "dark/strawberry/ingredients.txt", to: "ingredients.txt" }
      ];
      const expectedRecipeFilesSet = new Set([
        "chocolate.txt",
        "picking-strawberry.txt",
        "dark/strawberry/ingredients.txt"
      ]);
      assert.deepStrictEqual(
        recipeMvs,
        expectedRecipeMvs,
        "incorrect recipeMvs value!"
      );
      assert.deepStrictEqual(
        recipeFilesSet,
        expectedRecipeFilesSet,
        "incorrect recipeFilesSet value!"
      );
    });

    it("handles recipe without mv", () => {
      const { recipeMvs, recipeFilesSet } = utils.processRecipe(recipeFiles);
      const expectedRecipeMvs = [];
      const expectedRecipeFilesSet = new Set(recipeFiles);
      assert.deepStrictEqual(
        recipeMvs,
        expectedRecipeMvs,
        "incorrect recipeMvs value!"
      );
      assert.deepStrictEqual(
        recipeFilesSet,
        expectedRecipeFilesSet,
        "incorrect recipeFilesSet value!"
      );
    });
  });

  describe("getExtraFiles", () => {
    it("finds extra files when they exist (no FN)", () => {
      const val = utils.getExtraFiles(allFiles, new Set(recipeFiles));
      const expected = [
        "cookie-selection.txt",
        "picking-strawberry.txt",
        "milk/cookie/ingredients.txt",
        "dark/strawberry/ingredients.txt"
      ];
      assert.deepStrictEqual(val, expected);
    });

    it("finds no extra files when they do not exist (no FP)", () => {
      const val = utils.getExtraFiles(allFiles, new Set(allFiles));
      const expected = [];
      assert.deepStrictEqual(val, expected);
    });
  });
});
