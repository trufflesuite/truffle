import path from "path";
import fse from "fs-extra";
import inquirer from "inquirer";
import { boxConfig, boxConfigRecipeSpecMv } from "../../typings";

/**
 * Recursively travel through directory.
 * @param {string} dir Directory to traverse.
 * @param {boolean} returnRelative Return result as relative paths to dir.
 * @param {string} relativeDir Parent's relative path of current recursive call.
 * @returns {string[]} Path of every file in directory.
 */
function traverseDir(dir: string, returnRelative = true, relativeDir = "") {
  const result: string[] = [];

  fse.readdirSync(dir).forEach(file => {
    const absPath = path.join(dir, file);
    const relativePath = path.join(relativeDir, file);
    const isDir = fse.statSync(absPath).isDirectory();

    if (isDir) {
      // Recurse if file is dir.
      const nested = returnRelative
        ? traverseDir(absPath, true, relativePath)
        : traverseDir(absPath, false);
      result.push(...nested);
    } else {
      // Base case: File is not dir.
      const filePath = returnRelative ? relativePath : absPath;
      result.push(filePath);
    }
  });

  return result;
}

/**
 * Recursively remove all empty dirs.
 * @param {string} dir Root dir that (nested) empty dirs should be removed from.
 */
function removeEmptyDirs(dir: string, isRoot = true) {
  const isDir = fse.statSync(dir).isDirectory();
  // Bail if not dir.
  if (!isDir) {
    return;
  }

  let files = fse.readdirSync(dir);
  if (files.length > 0) {
    files.forEach(file => {
      const fileAbs = path.join(dir, file);
      removeEmptyDirs(fileAbs, false);
    });
    // Dir may be empty after deleting nested dirs. Re-evaluate.
    files = fse.readdirSync(dir);
  }

  if (files.length === 0 && !isRoot) {
    fse.rmdirSync(dir);
  }
}

/**
 * @param boxConfig
 * @returns {boolean}
 */
function boxHasRecipe(boxConfig: boxConfig) {
  return Object.keys(boxConfig.recipes).length > 0;
}

/**
 * User provides option / answers prompts to locate recipe.
 * @param recipes Box config recipes property.
 * @param option `unbox` cmd `--recipe` flag value.
 * @returns Files for chosen recipe.
 */
async function locateRecipe({ recipes }: boxConfig, option: string) {
  let useOption = option !== undefined;
  const optionArr = option?.split?.(",") || [];
  let recipeFiles = null;
  let recipeScope = recipes.specs;
  let counter = 0;

  // Try using option (if provided) to get recipe.
  // Fallback to inquirer prompts.
  while (!recipeFiles) {
    if (Array.isArray(recipeScope)) {
      recipeFiles = recipeScope.concat(recipes.common);
      break;
    }

    const curScopeChoices = Object.keys(recipeScope);

    const { choice } = await inquirer.prompt([
      {
        type: "list",
        choices: curScopeChoices,
        message: recipes.prompts[counter].message,
        default: recipes.prompts[counter].default,
        name: "choice",
        when: hash => {
          if (useOption) {
            const curOptionChoice = optionArr[counter];
            const validChoice = curScopeChoices.includes(curOptionChoice);
            if (validChoice) {
              // Don't prompt if current option choice is valid.
              hash.choice = curOptionChoice;
              return false;
            }
            useOption = false;
          }
          return true;
        }
      }
    ]);

    recipeScope = recipeScope[choice];
    counter += 1;
  }

  return recipeFiles;
}

/**
 * @param recipeFiles
 * @returns Recipe mv ops, set of files paths (ignoring mv).
 */
function processRecipe(recipeFiles: Array<string | boxConfigRecipeSpecMv>) {
  const recipeMvs: boxConfigRecipeSpecMv[] = [];
  const recipeFilesSet = new Set<string>();

  recipeFiles.forEach(file => {
    if (typeof file === "string") {
      recipeFilesSet.add(file);
    } else {
      recipeFilesSet.add(file.from);
      recipeMvs.push(file);
    }
  });

  return { recipeMvs, recipeFilesSet };
}

/**
 * @param allFiles All files in box, ignoring recipes.
 * @param recipeFilesSet Files specific to recipe.
 * @returns All files not in recipe.
 */
function getExtraFiles(allFiles: string[], recipeFilesSet: Set<string>) {
  return allFiles.filter(file => !recipeFilesSet.has(file));
}

/**
 * Find box recipe (through CLI option or interacting with inquirer) and modify box.
 * Called after box hooks call.
 */
async function followBoxRecipe(
  boxConfig: boxConfig,
  destination: string,
  option: string
) {
  // Bail if no recipe defined.
  if (!boxHasRecipe(boxConfig)) {
    return;
  }

  const recipeFiles = await locateRecipe(boxConfig, option);
  const { recipeMvs, recipeFilesSet } = processRecipe(recipeFiles);
  const allFiles = traverseDir(destination);
  const extraFiles = getExtraFiles(allFiles, recipeFilesSet);

  // Remove files not in recipe.
  extraFiles.forEach(extraFile => {
    fse.removeSync(path.join(destination, extraFile));
  });

  // Move / rename files.
  recipeMvs.forEach(mv => {
    const mvFrom = path.join(destination, mv.from);
    const mvTo = path.join(destination, mv.to);
    // Create parent dir of mvTo in case it doens't exist.
    fse.ensureDirSync(path.dirname(mvTo));
    fse.renameSync(mvFrom, mvTo);
  });

  // Some dirs may be empty after removing + moving + renaming. Clean up.
  removeEmptyDirs(destination);
}

export default {
  traverseDir,
  removeEmptyDirs,
  boxHasRecipe,
  locateRecipe,
  processRecipe,
  getExtraFiles,
  followBoxRecipe
};
