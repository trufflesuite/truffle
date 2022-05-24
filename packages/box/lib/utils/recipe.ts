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

export { traverseDir };
