import * as path from "path";

function shouldIncludePath(filePath: string) {
  return [".ligo", ".mligo", ".religo"].includes(path.extname(filePath));
}

export { shouldIncludePath };