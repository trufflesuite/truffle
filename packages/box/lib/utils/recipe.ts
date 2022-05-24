import path from "path";
import fse from "fs-extra";

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

export { traverseDir, removeEmptyDirs };
