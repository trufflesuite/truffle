import path from "path";

export function shouldIncludePath(filePath: string) {
  const validExtensions = [".sol", ".json"];
  return validExtensions.some(
    extension => path.extname(filePath) === extension
  );
}
