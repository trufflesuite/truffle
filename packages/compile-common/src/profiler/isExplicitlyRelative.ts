export const isExplicitlyRelative = (importPath: string): boolean => {
  return importPath.indexOf(".") === 0;
};
