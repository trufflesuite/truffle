module.exports = (path, options) => {
  return options.defaultResolver(path, {
    ...options,
    packageFilter: pkg => {
      // See: https://github.com/microsoft/accessibility-insights-web/pull/5421#issuecomment-1109168149
      if (pkg.name === "uuid") {
        delete pkg.exports;
        delete pkg.module;
      }
      return pkg;
    }
  });
};
